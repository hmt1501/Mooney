import { SupabaseClient } from '@supabase/supabase-js';
import {
  createLocalRepositories,
  GUEST_SCOPE,
  NEVER_EDITED_AT,
} from '@/lib/repository/localRepository';
import {
  SupabaseTransactionRepository,
  SupabaseIncomeRepository,
  SupabaseCategoryRepository,
  SupabaseRecurringBillRepository,
  SupabaseSettingsRepository,
} from '@/lib/repository/supabaseRepository';
import { Transaction } from '@/types/transaction';
import { IncomeItem } from '@/types/income';
import { Category } from '@/types/category';
import { RecurringBill } from '@/types/bill';
import { UserSettings } from '@/types/settings';

export interface SyncResult {
  success: boolean;
  error?: string;
  /** Số bản ghi của khách (chưa đăng nhập) được chuyển vào tài khoản ở lần đồng bộ đầu tiên */
  migratedCount: number;
  /** Tổng số thay đổi đã áp dụng (đẩy lên + tải về + xóa hai phía) */
  syncedCount: number;
  uploadedCount: number;
  downloadedCount: number;
  deletedRemoteCount: number;
  deletedLocalCount: number;
  /** Thời điểm đồng bộ thành công gần nhất (null nếu chưa từng thành công) */
  lastSyncedAt: string | null;
}

type VersionMap = Record<string, string>;

/**
 * Trạng thái đã khớp giữa local và cloud ở lần đồng bộ thành công gần nhất.
 * Dùng làm "bản gốc" cho so sánh 3 phía: nhờ đó phân biệt được
 * "mới tạo ở một phía" với "đã bị xóa ở phía kia".
 */
interface SyncMeta {
  version: 1;
  lastSyncedAt: string | null;
  base: {
    transactions: VersionMap;
    incomes: VersionMap;
    categories: VersionMap;
    bills: VersionMap;
    settings: string | null;
  };
}

// Khóa toàn cục do phiên bản Sync Engine cũ ghi (không phân theo user)
const LEGACY_LAST_SYNC_KEY = 'mooney_last_synced_at';
const LEGACY_JUNK_KEYS = [
  'mooney_transactions',
  'mooney_incomes',
  'mooney_categories',
  'mooney_bills',
];

function isBrowser(): boolean {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

function syncMetaKey(userId: string): string {
  return `mooney_v1_user_${userId}_sync_meta`;
}

function emptyBase(): SyncMeta['base'] {
  return { transactions: {}, incomes: {}, categories: {}, bills: {}, settings: null };
}

function readSyncMeta(userId: string): SyncMeta | null {
  if (!isBrowser()) return null;
  try {
    const raw = window.localStorage.getItem(syncMetaKey(userId));
    return raw ? (JSON.parse(raw) as SyncMeta) : null;
  } catch {
    return null;
  }
}

function writeSyncMeta(userId: string, meta: SyncMeta): void {
  if (!isBrowser()) return;
  window.localStorage.setItem(syncMetaKey(userId), JSON.stringify(meta));
}

/**
 * Lấy thời gian đồng bộ thành công lần cuối của một tài khoản trên thiết bị này
 */
export function getLastSyncedAt(userId: string | null | undefined): string | null {
  if (!userId) return null;
  return readSyncMeta(userId)?.lastSyncedAt ?? null;
}

/**
 * Quên trạng thái đã khớp (dùng sau khi đặt lại hoặc nhập dữ liệu cục bộ).
 * Lần đồng bộ sau sẽ gộp theo Last-Write-Wins thay vì coi dữ liệu cục bộ bị thiếu là "đã xóa",
 * nên không bao giờ xóa hàng loạt dữ liệu trên cloud.
 */
export function resetSyncBase(userId: string): void {
  writeSyncMeta(userId, { version: 1, lastSyncedAt: null, base: emptyBase() });
}

function toTime(value: string | undefined | null): number {
  const time = value ? new Date(value).getTime() : 0;
  return Number.isNaN(time) ? 0 : time;
}

function sameVersion(a: string | undefined | null, b: string | undefined | null): boolean {
  if (a === b) return true;
  if (!a || !b) return false;
  return toTime(a) === toTime(b);
}

/**
 * Giải thuật Deterministic Conflict Resolution (Last-Write-Wins) 2 phía.
 * Giữ lại để tương thích; Sync Engine dùng planEntitySync (3 phía) bên dưới.
 */
export function resolveEntityConflicts<T extends { id: string; updatedAt?: string }>(
  localItems: T[],
  remoteItems: T[]
): {
  merged: T[];
  toUpload: T[];
  toSaveLocal: T[];
} {
  const localMap = new Map<string, T>(localItems.map((item) => [item.id, item]));
  const remoteMap = new Map<string, T>(remoteItems.map((item) => [item.id, item]));

  const merged: T[] = [];
  const toUpload: T[] = [];
  const toSaveLocal: T[] = [];

  for (const [id, localItem] of localMap.entries()) {
    const remoteItem = remoteMap.get(id);

    if (!remoteItem) {
      merged.push(localItem);
      toUpload.push(localItem);
    } else {
      const localTime = toTime(localItem.updatedAt);
      const remoteTime = toTime(remoteItem.updatedAt);

      if (localTime >= remoteTime) {
        merged.push(localItem);
        if (localTime > remoteTime) {
          toUpload.push(localItem);
        }
      } else {
        merged.push(remoteItem);
        toSaveLocal.push(remoteItem);
      }
    }
  }

  for (const [id, remoteItem] of remoteMap.entries()) {
    if (!localMap.has(id)) {
      merged.push(remoteItem);
      toSaveLocal.push(remoteItem);
    }
  }

  return { merged, toUpload, toSaveLocal };
}

export interface EntitySyncPlan<T> {
  toUpload: T[];
  toDeleteRemote: string[];
  toSaveLocal: T[];
  toDeleteLocal: string[];
}

/**
 * Lập kế hoạch đồng bộ 3 phía cho một loại thực thể.
 *
 * - Chỉ một phía thay đổi so với base -> phía đó thắng.
 * - Cả hai phía cùng thay đổi (hoặc chưa có base) -> Last-Write-Wins theo updatedAt (hòa -> cloud thắng).
 * - Có trong base, mất ở một phía, phía còn lại không đổi -> xóa ở phía còn lại.
 * - Có trong base, mất ở một phía, phía còn lại đã sửa -> giữ bản đã sửa (sửa thắng xóa).
 *
 * Mọi quyết định theo id, nên một bản ghi không bao giờ bị nhân đôi.
 * `mergeConflict` cho phép gộp trường khi cả hai phía cùng sửa (vd. các kỳ hóa đơn đã thanh toán).
 */
export function planEntitySync<T extends { id: string; updatedAt?: string }>(
  localItems: T[],
  remoteItems: T[],
  base: VersionMap,
  mergeConflict?: (winner: T, loser: T) => T
): EntitySyncPlan<T> {
  const localMap = new Map(localItems.map((item) => [item.id, item]));
  const remoteMap = new Map(remoteItems.map((item) => [item.id, item]));
  const ids = new Set<string>([...localMap.keys(), ...remoteMap.keys()]);

  const plan: EntitySyncPlan<T> = {
    toUpload: [],
    toDeleteRemote: [],
    toSaveLocal: [],
    toDeleteLocal: [],
  };

  for (const id of ids) {
    const local = localMap.get(id);
    const remote = remoteMap.get(id);
    const baseVersion = base[id];
    const inBase = baseVersion !== undefined;

    if (local && remote) {
      if (sameVersion(local.updatedAt, remote.updatedAt)) continue;

      const localChanged = !inBase || !sameVersion(local.updatedAt, baseVersion);
      const remoteChanged = !inBase || !sameVersion(remote.updatedAt, baseVersion);

      if (localChanged && !remoteChanged) {
        plan.toUpload.push(local);
      } else if (remoteChanged && !localChanged) {
        plan.toSaveLocal.push(remote);
      } else {
        const localWins = toTime(local.updatedAt) > toTime(remote.updatedAt);
        const winner = localWins ? local : remote;
        const loser = localWins ? remote : local;
        if (mergeConflict) {
          plan.toUpload.push(mergeConflict(winner, loser));
        } else if (localWins) {
          plan.toUpload.push(local);
        } else {
          plan.toSaveLocal.push(remote);
        }
      }
    } else if (local) {
      if (inBase && sameVersion(local.updatedAt, baseVersion)) {
        plan.toDeleteLocal.push(id);
      } else {
        plan.toUpload.push(local);
      }
    } else if (remote) {
      if (inBase && sameVersion(remote.updatedAt, baseVersion)) {
        plan.toDeleteRemote.push(id);
      } else {
        plan.toSaveLocal.push(remote);
      }
    }
  }

  return plan;
}

/**
 * Khi cả hai thiết bị cùng sửa một hóa đơn: giữ bản mới hơn nhưng hợp nhất các kỳ đã thanh toán,
 * để không kỳ nào bị coi là "chưa trả" và bị thanh toán lần hai.
 */
export function mergeBillConflict(winner: RecurringBill, loser: RecurringBill): RecurringBill {
  const paid = new Set([...(winner.paidOccurrences || []), ...(loser.paidOccurrences || [])]);
  const maxDate = (a?: string, b?: string) => (!a ? b : !b ? a : a > b ? a : b);
  const bothOneTime = winner.repeat === 'never' && loser.repeat === 'never';

  return {
    ...winner,
    paidOccurrences: paid.size > 0 ? Array.from(paid).sort() : undefined,
    lastPaidDate: maxDate(winner.lastPaidDate, loser.lastPaidDate),
    lastPaidDueDate: maxDate(winner.lastPaidDueDate, loser.lastPaidDueDate),
    dueDate: bothOneTime ? winner.dueDate : maxDate(winner.dueDate, loser.dueDate) || winner.dueDate,
    isActive: bothOneTime && (winner.lastPaidDate || loser.lastPaidDate) ? false : winner.isActive,
  };
}

/**
 * Áp dụng thay đổi từ cloud vào cache cục bộ.
 * Đọc lại dữ liệu cục bộ mới nhất thay vì dùng snapshot, nên thay đổi người dùng thực hiện
 * trong lúc đang đồng bộ không bị ghi đè (chúng sẽ được đẩy lên ở lần sau).
 */
function applyToLocal<T extends { id: string; updatedAt?: string }>(
  current: T[],
  snapshot: T[],
  incoming: T[],
  deleteIds: string[]
): T[] {
  const snapshotMap = new Map(snapshot.map((item) => [item.id, item]));
  const result = new Map(current.map((item) => [item.id, item]));

  const untouchedSinceSnapshot = (id: string) => {
    const now = result.get(id);
    const before = snapshotMap.get(id);
    if (!before) return !now; // chưa có lúc chụp -> chỉ thêm nếu vẫn chưa có
    return !!now && now.updatedAt === before.updatedAt;
  };

  for (const item of incoming) {
    if (untouchedSinceSnapshot(item.id)) {
      result.set(item.id, item);
    }
  }

  for (const id of deleteIds) {
    if (untouchedSinceSnapshot(id)) {
      result.delete(id);
    }
  }

  return Array.from(result.values());
}

function toVersionMap<T extends { id: string; updatedAt?: string }>(items: Iterable<T>): VersionMap {
  const map: VersionMap = {};
  for (const item of items) {
    map[item.id] = item.updatedAt || '';
  }
  return map;
}

/** Trạng thái cloud sau khi đã đẩy thay đổi -> dùng làm base cho lần sau */
function finalRemoteVersions<T extends { id: string; updatedAt?: string }>(
  remote: T[],
  plan: EntitySyncPlan<T>,
  uploadedRows: T[]
): VersionMap {
  const map = new Map(remote.map((item) => [item.id, item]));
  for (const id of plan.toDeleteRemote) map.delete(id);
  for (const row of uploadedRows) map.set(row.id, row);
  return toVersionMap(map.values());
}

const isCustomCategory = (category: Category) => !category.isDefault;

const inFlight = new Map<string, Promise<SyncResult>>();

/**
 * Đồng bộ thủ công / tự động giữa cache cục bộ của một tài khoản và Supabase.
 * Các lần gọi chồng nhau cho cùng tài khoản dùng chung một tiến trình (không đẩy trùng).
 */
export function performFullSync(supabase: SupabaseClient, userId: string): Promise<SyncResult> {
  const running = inFlight.get(userId);
  if (running) return running;

  const task = runSync(supabase, userId).finally(() => {
    inFlight.delete(userId);
  });
  inFlight.set(userId, task);
  return task;
}

async function runSync(supabase: SupabaseClient, userId: string): Promise<SyncResult> {
  const previousMeta = readSyncMeta(userId);

  try {
    if (!isBrowser()) {
      throw new Error('Đồng bộ chỉ chạy trên trình duyệt.');
    }

    // 0. Xác thực phiên với máy chủ. Nếu phiên hết hạn, RLS trả về danh sách rỗng thay vì lỗi,
    //    và dữ liệu rỗng đó sẽ bị hiểu nhầm là "đã xóa trên cloud". Vì vậy phải dừng ở đây.
    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError || !authData?.user) {
      throw new Error('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
    }
    if (authData.user.id !== userId) {
      throw new Error('Phiên đăng nhập không khớp tài khoản đang đồng bộ.');
    }

    const local = createLocalRepositories(userId);
    const guest = createLocalRepositories(GUEST_SCOPE);
    const remoteTx = new SupabaseTransactionRepository(supabase, userId);
    const remoteIncome = new SupabaseIncomeRepository(supabase, userId);
    const remoteCat = new SupabaseCategoryRepository(supabase, userId);
    const remoteBill = new SupabaseRecurringBillRepository(supabase, userId);
    const remoteSettings = new SupabaseSettingsRepository(supabase, userId);

    await local.dataManagement.initializeWithSeedData(false);

    // 1. PULL: tải trạng thái mới nhất trên cloud
    const [cloudTx, cloudIncomes, cloudCatsAll, cloudBills, cloudSettings] = await Promise.all([
      remoteTx.getAll(),
      remoteIncome.getAll(),
      remoteCat.getAll(),
      remoteBill.getAll(),
      remoteSettings.getRow(),
    ]);
    const cloudCats = cloudCatsAll.filter(isCustomCategory);

    // 2. Lần đầu tài khoản này đồng bộ trên thiết bị: quyết định có nhận dữ liệu khách hay không
    let migratedCount = 0;
    let adoptedGuest = false;
    const hasLegacyData = window.localStorage.getItem(LEGACY_LAST_SYNC_KEY) !== null;

    if (!previousMeta) {
      const [gTx, gInc, gCats, gBills, gSettings, uTx, uInc, uCats, uBills] = await Promise.all([
        guest.transactions.getAll(),
        guest.incomes.getAll(),
        guest.categories.getAll(),
        guest.bills.getAll(),
        guest.settings.get(),
        local.transactions.getAll(),
        local.incomes.getAll(),
        local.categories.getAll(),
        local.bills.getAll(),
      ]);

      const guestItemCount =
        gTx.length + gInc.length + gBills.length + gCats.filter(isCustomCategory).length;
      const guestHasData = guestItemCount > 0 || gSettings.startingBalance !== 0;
      const accountLocalHasData =
        uTx.length + uInc.length + uBills.length + uCats.filter(isCustomCategory).length > 0;
      const cloudHasData =
        cloudTx.length + cloudIncomes.length + cloudBills.length + cloudCats.length > 0;

      // Chỉ nhận dữ liệu khách khi tài khoản trên cloud còn trống (đăng ký lần đầu),
      // hoặc khi nâng cấp từ bản cũ vốn dùng chung một vùng lưu trữ cho mọi người.
      // Không bao giờ gộp dữ liệu khách vào một tài khoản đã có dữ liệu của người khác.
      if (guestHasData && !accountLocalHasData && (!cloudHasData || hasLegacyData)) {
        await Promise.all([
          local.transactions.replaceAll(gTx),
          local.incomes.replaceAll(gInc),
          local.categories.replaceAll(gCats),
          local.bills.replaceAll(gBills),
          local.settings.replace(
            cloudHasData ? gSettings : { ...gSettings, updatedAt: new Date().toISOString() }
          ),
        ]);
        adoptedGuest = true;
        migratedCount = guestItemCount;
      }
    }

    // 3. Chụp snapshot cục bộ và lập kế hoạch 3 phía
    const base = previousMeta?.base ?? emptyBase();
    const [snapTx, snapIncomes, snapCatsAll, snapBills, snapSettings] = await Promise.all([
      local.transactions.getAll(),
      local.incomes.getAll(),
      local.categories.getAll(),
      local.bills.getAll(),
      local.settings.get(),
    ]);
    const snapCats = snapCatsAll.filter(isCustomCategory);

    const txPlan = planEntitySync<Transaction>(snapTx, cloudTx, base.transactions);
    const incomePlan = planEntitySync<IncomeItem>(snapIncomes, cloudIncomes, base.incomes);
    const catPlan = planEntitySync<Category>(snapCats, cloudCats, base.categories);
    const billPlan = planEntitySync<RecurringBill>(snapBills, cloudBills, base.bills, mergeBillConflict);

    let settingsAction: 'none' | 'upload' | 'saveLocal' = 'none';
    if (!cloudSettings) {
      settingsAction = 'upload';
    } else if (!sameVersion(snapSettings.updatedAt, cloudSettings.updatedAt)) {
      const localChanged = !base.settings || !sameVersion(snapSettings.updatedAt, base.settings);
      const remoteChanged = !base.settings || !sameVersion(cloudSettings.updatedAt, base.settings);
      if (localChanged && !remoteChanged) {
        settingsAction = 'upload';
      } else if (remoteChanged && !localChanged) {
        settingsAction = 'saveLocal';
      } else {
        const localNeverEdited = sameVersion(snapSettings.updatedAt, NEVER_EDITED_AT);
        settingsAction =
          !localNeverEdited && toTime(snapSettings.updatedAt) > toTime(cloudSettings.updatedAt)
            ? 'upload'
            : 'saveLocal';
      }
    }

    // 4. PUSH: đẩy thay đổi cục bộ lên cloud. Bất kỳ lỗi nào cũng dừng toàn bộ đồng bộ
    //    trước khi ghi cache cục bộ; các thao tác theo id nên chạy lại an toàn.
    const [txRows, incomeRows, catRows, billRows, settingsRow] = await Promise.all([
      remoteTx.upsertMany(txPlan.toUpload),
      remoteIncome.upsertMany(incomePlan.toUpload),
      remoteCat.upsertMany(catPlan.toUpload),
      remoteBill.upsertMany(billPlan.toUpload),
      settingsAction === 'upload' ? remoteSettings.upsert(snapSettings) : Promise.resolve(null),
    ]);
    await Promise.all([
      remoteTx.deleteMany(txPlan.toDeleteRemote),
      remoteIncome.deleteMany(incomePlan.toDeleteRemote),
      remoteCat.deleteMany(catPlan.toDeleteRemote),
      remoteBill.deleteMany(billPlan.toDeleteRemote),
    ]);

    // 5. MERGE vào cache cục bộ: bản tải về + bản server trả lại sau khi đẩy (updated_at chuẩn của server)
    const [curTx, curIncomes, curCats, curBills, curSettings] = await Promise.all([
      local.transactions.getAll(),
      local.incomes.getAll(),
      local.categories.getAll(),
      local.bills.getAll(),
      local.settings.get(),
    ]);

    await Promise.all([
      local.transactions.replaceAll(
        applyToLocal(curTx, snapTx, [...txPlan.toSaveLocal, ...txRows], txPlan.toDeleteLocal)
      ),
      local.incomes.replaceAll(
        applyToLocal(curIncomes, snapIncomes, [...incomePlan.toSaveLocal, ...incomeRows], incomePlan.toDeleteLocal)
      ),
      local.categories.replaceAll(
        applyToLocal(curCats, snapCatsAll, [...catPlan.toSaveLocal, ...catRows], catPlan.toDeleteLocal)
      ),
      local.bills.replaceAll(
        applyToLocal(curBills, snapBills, [...billPlan.toSaveLocal, ...billRows], billPlan.toDeleteLocal)
      ),
    ]);

    const settingsFromServer: UserSettings | null =
      settingsAction === 'upload' ? settingsRow : settingsAction === 'saveLocal' ? cloudSettings : null;
    if (settingsFromServer && curSettings.updatedAt === snapSettings.updatedAt) {
      await local.settings.replace(settingsFromServer);
    }

    // 6. Ghi nhận trạng thái đã khớp
    const lastSyncedAt = new Date().toISOString();
    writeSyncMeta(userId, {
      version: 1,
      lastSyncedAt,
      base: {
        transactions: finalRemoteVersions(cloudTx, txPlan, txRows),
        incomes: finalRemoteVersions(cloudIncomes, incomePlan, incomeRows),
        categories: finalRemoteVersions(cloudCats, catPlan, catRows),
        bills: finalRemoteVersions(cloudBills, billPlan, billRows),
        settings: (settingsRow ?? cloudSettings)?.updatedAt ?? null,
      },
    });

    // Dữ liệu khách đã thuộc về tài khoản này -> dọn vùng khách để tài khoản khác không nhận lại
    if (adoptedGuest) {
      await guest.dataManagement.resetAllData();
    }
    window.localStorage.removeItem(LEGACY_LAST_SYNC_KEY);
    LEGACY_JUNK_KEYS.forEach((key) => window.localStorage.removeItem(key));

    const plans = [txPlan, incomePlan, catPlan, billPlan];
    const uploadedCount =
      plans.reduce((sum, plan) => sum + plan.toUpload.length, 0) + (settingsAction === 'upload' ? 1 : 0);
    const downloadedCount =
      plans.reduce((sum, plan) => sum + plan.toSaveLocal.length, 0) + (settingsAction === 'saveLocal' ? 1 : 0);
    const deletedRemoteCount = plans.reduce((sum, plan) => sum + plan.toDeleteRemote.length, 0);
    const deletedLocalCount = plans.reduce((sum, plan) => sum + plan.toDeleteLocal.length, 0);

    return {
      success: true,
      migratedCount,
      syncedCount: uploadedCount + downloadedCount + deletedRemoteCount + deletedLocalCount,
      uploadedCount,
      downloadedCount,
      deletedRemoteCount,
      deletedLocalCount,
      lastSyncedAt,
    };
  } catch (err: unknown) {
    console.error('[SyncEngine] Sync error:', err);
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Lỗi không xác định khi đồng bộ',
      migratedCount: 0,
      syncedCount: 0,
      uploadedCount: 0,
      downloadedCount: 0,
      deletedRemoteCount: 0,
      deletedLocalCount: 0,
      lastSyncedAt: previousMeta?.lastSyncedAt ?? null,
    };
  }
}

/**
 * Có thay đổi cục bộ nào chưa được đẩy lên cloud không (so với trạng thái đã khớp lần trước).
 */
export async function hasPendingChanges(userId: string): Promise<boolean> {
  const meta = readSyncMeta(userId);
  if (!meta || !meta.lastSyncedAt) return true;

  const local = createLocalRepositories(userId);
  const [tx, incomes, cats, bills, settings] = await Promise.all([
    local.transactions.getAll(),
    local.incomes.getAll(),
    local.categories.getAll(),
    local.bills.getAll(),
    local.settings.get(),
  ]);

  const differs = <T extends { id: string; updatedAt?: string }>(items: T[], base: VersionMap) => {
    if (items.length !== Object.keys(base).length) return true;
    return items.some((item) => base[item.id] === undefined || !sameVersion(item.updatedAt, base[item.id]));
  };

  return (
    differs(tx, meta.base.transactions) ||
    differs(incomes, meta.base.incomes) ||
    differs(cats.filter(isCustomCategory), meta.base.categories) ||
    differs(bills, meta.base.bills) ||
    (meta.base.settings !== null && !sameVersion(settings.updatedAt, meta.base.settings))
  );
}
