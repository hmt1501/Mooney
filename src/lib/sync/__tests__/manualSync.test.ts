import { describe, it, expect, beforeEach } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import {
  performFullSync,
  planEntitySync,
  mergeBillConflict,
  hasPendingChanges,
  getLastSyncedAt,
  resetSyncBase,
} from '../syncEngine';
import { createLocalRepositories } from '@/lib/repository/localRepository';
import {
  mapBillFromDb,
  mapBillToDb,
  mapIncomeToDb,
  mapTransactionFromDb,
  mapTransactionToDb,
} from '@/lib/repository/supabaseRepository';
import { RecurringBill } from '@/types/bill';
import { Transaction } from '@/types/transaction';

// ----------------------------------------------------------------------------
// localStorage giả lập cho môi trường node
// ----------------------------------------------------------------------------
const store = new Map<string, string>();
const mockLocalStorage = {
  getItem: (key: string) => (store.has(key) ? store.get(key)! : null),
  setItem: (key: string, value: string) => void store.set(key, String(value)),
  removeItem: (key: string) => void store.delete(key),
  clear: () => store.clear(),
};
(globalThis as unknown as { window: { localStorage: typeof mockLocalStorage } }).window = {
  localStorage: mockLocalStorage,
};

// ----------------------------------------------------------------------------
// Supabase giả lập trong bộ nhớ, mô phỏng RLS "auth.uid() = user_id"
// và trigger updated_at = NOW() khi UPDATE.
// ----------------------------------------------------------------------------
type Row = Record<string, any>;

let clock = Date.parse('2026-09-14T00:00:00.000Z');
const tick = () => new Date((clock += 1000)).toISOString();

class FakeSupabase {
  tables: Record<string, Map<string, Row>> = {
    transactions: new Map(),
    incomes: new Map(),
    categories: new Map(),
    recurring_bills: new Map(),
    user_settings: new Map(),
  };
  sessionUserId: string | null = null;
  failWrites: string | null = null;

  asClient(): SupabaseClient {
    const auth = {
      getUser: async () =>
        this.sessionUserId
          ? { data: { user: { id: this.sessionUserId } }, error: null }
          : { data: { user: null }, error: { message: 'JWT expired' } },
    };
    return { auth, from: (table: string) => new FakeQuery(this, table) } as unknown as SupabaseClient;
  }

  pk(table: string, row: Row) {
    return table === 'user_settings' ? row.user_id : row.id;
  }
}

class FakeQuery {
  private op: 'select' | 'upsert' | 'delete' = 'select';
  private filters: ((row: Row) => boolean)[] = [];
  private payload: Row[] = [];
  private returnRows = false;
  private singleMode: 'none' | 'maybe' | 'one' = 'none';

  constructor(private db: FakeSupabase, private table: string) {}

  select() {
    if (this.op !== 'select') this.returnRows = true;
    return this;
  }
  upsert(rows: Row | Row[]) {
    this.op = 'upsert';
    this.payload = Array.isArray(rows) ? rows : [rows];
    return this;
  }
  delete() {
    this.op = 'delete';
    return this;
  }
  eq(col: string, value: unknown) {
    this.filters.push((row) => row[col] === value);
    return this;
  }
  in(col: string, values: unknown[]) {
    this.filters.push((row) => values.includes(row[col]));
    return this;
  }
  order() {
    return this;
  }
  maybeSingle() {
    this.singleMode = 'maybe';
    return this;
  }
  single() {
    this.singleMode = 'one';
    return this;
  }

  // supabase-js query builders là thenable
  then(resolve: (value: { data: any; error: any }) => void) {
    resolve(this.execute());
  }

  private visible(row: Row) {
    return row.user_id === this.db.sessionUserId;
  }

  private execute(): { data: any; error: any } {
    const table = this.db.tables[this.table];
    if (this.op === 'select') {
      const rows = [...table.values()].filter((r) => this.visible(r) && this.filters.every((f) => f(r)));
      if (this.singleMode !== 'none') return { data: rows[0] ?? null, error: null };
      return { data: rows.map((r) => ({ ...r })), error: null };
    }

    if (this.db.failWrites) {
      return { data: null, error: { message: this.db.failWrites, code: 'PGRST204' } };
    }

    if (this.op === 'delete') {
      for (const [key, row] of table.entries()) {
        if (this.visible(row) && this.filters.every((f) => f(row))) table.delete(key);
      }
      return { data: null, error: null };
    }

    const written: Row[] = [];
    for (const incoming of this.payload) {
      if (incoming.user_id !== this.db.sessionUserId) {
        return { data: null, error: { message: 'new row violates row-level security policy' } };
      }
      const key = this.db.pk(this.table, incoming);
      const existing = table.get(key);
      if (existing && existing.user_id !== this.db.sessionUserId) {
        return { data: null, error: { message: 'new row violates row-level security policy' } };
      }
      const row = existing
        ? { ...existing, ...incoming, updated_at: tick() } // trigger khi UPDATE
        : { ...incoming, updated_at: incoming.updated_at || tick() };
      table.set(key, row);
      written.push({ ...row });
    }
    if (!this.returnRows) return { data: null, error: null };
    return { data: this.singleMode === 'none' ? written : written[0], error: null };
  }
}

// ----------------------------------------------------------------------------
const USER_A = '11111111-1111-1111-1111-111111111111';
const USER_B = '22222222-2222-2222-2222-222222222222';

function newTx(id: string, amount: number, updatedAt = tick()): Transaction {
  return { id, type: 'expense', amount, categoryId: 'cat-food', date: '2026-09-14', createdAt: updatedAt, updatedAt };
}

describe('planEntitySync (so sánh 3 phía)', () => {
  const t1 = '2026-09-14T01:00:00.000Z';
  const t2 = '2026-09-14T02:00:00.000Z';

  it('item mới ở local -> upload; mới ở cloud -> lưu local', () => {
    const plan = planEntitySync([newTx('a', 1, t1)], [newTx('b', 2, t1)], {});
    expect(plan.toUpload.map((i) => i.id)).toEqual(['a']);
    expect(plan.toSaveLocal.map((i) => i.id)).toEqual(['b']);
  });

  it('đã khớp trước đó, bị xóa ở local -> xóa trên cloud (không tải lại)', () => {
    const plan = planEntitySync([], [newTx('a', 1, t1)], { a: t1 });
    expect(plan.toDeleteRemote).toEqual(['a']);
    expect(plan.toSaveLocal).toHaveLength(0);
  });

  it('đã khớp trước đó, bị xóa trên cloud -> xóa ở local (không đẩy lại)', () => {
    const plan = planEntitySync([newTx('a', 1, t1)], [], { a: t1 });
    expect(plan.toDeleteLocal).toEqual(['a']);
    expect(plan.toUpload).toHaveLength(0);
  });

  it('bị xóa ở một phía nhưng đã sửa ở phía kia -> giữ bản đã sửa', () => {
    expect(planEntitySync([newTx('a', 5, t2)], [], { a: t1 }).toUpload).toHaveLength(1);
    expect(planEntitySync([], [newTx('a', 5, t2)], { a: t1 }).toSaveLocal).toHaveLength(1);
  });

  it('chỉ cloud đổi -> lấy cloud dù đồng hồ local chạy nhanh hơn', () => {
    const local = newTx('a', 1, t1);
    const remote = newTx('a', 9, '2026-09-14T01:30:00.000+00:00');
    const plan = planEntitySync([local], [remote], { a: t1 });
    expect(plan.toSaveLocal[0].amount).toBe(9);
    expect(plan.toUpload).toHaveLength(0);
  });

  it('cùng phiên bản với định dạng thời gian khác nhau -> không làm gì', () => {
    const plan = planEntitySync([newTx('a', 1, t1)], [newTx('a', 1, '2026-09-14T01:00:00+00:00')], { a: t1 });
    expect(plan.toUpload.length + plan.toSaveLocal.length).toBe(0);
  });

  it('hóa đơn bị sửa ở cả hai phía -> hợp nhất các kỳ đã thanh toán', () => {
    const base: RecurringBill = {
      id: 'bill-1', name: 'Internet', amount: 200_000, categoryId: 'cat-bill', dueDate: '2026-09-01',
      repeat: 'monthly', isActive: true, createdAt: t1, updatedAt: t1,
    };
    const local = { ...base, dueDate: '2026-10-01', paidOccurrences: ['2026-09-01'], lastPaidDueDate: '2026-09-01', updatedAt: t2 };
    const remote = { ...base, name: 'Internet FPT', updatedAt: '2026-09-14T01:30:00.000Z' };
    const plan = planEntitySync([local], [remote], { 'bill-1': t1 }, mergeBillConflict);
    expect(plan.toUpload).toHaveLength(1);
    expect(plan.toUpload[0].paidOccurrences).toEqual(['2026-09-01']);
    expect(plan.toUpload[0].dueDate).toBe('2026-10-01');
  });
});

describe('Mappers giữ đủ dữ liệu chống trùng lặp', () => {
  it('giao dịch giữ liên kết billId qua cloud', () => {
    const tx = { ...newTx('tx-1', 100), billId: 'bill-1' };
    expect(mapTransactionFromDb(mapTransactionToDb(tx, USER_A)).billId).toBe('bill-1');
  });

  it('hóa đơn giữ các kỳ đã thanh toán và ghi chú qua cloud', () => {
    const bill: RecurringBill = {
      id: 'bill-1', name: 'Nhà', amount: 5_000_000, categoryId: 'cat-home', dueDate: '2026-10-05', repeat: 'monthly',
      note: 'Chủ nhà', isActive: true, lastPaidDate: '2026-09-05', lastPaidDueDate: '2026-09-05',
      paidOccurrences: ['2026-08-05', '2026-09-05'], createdAt: '2026-08-01T00:00:00Z', updatedAt: '2026-09-05T00:00:00Z',
    };
    const restored = mapBillFromDb(mapBillToDb(bill, USER_A));
    expect(restored.paidOccurrences).toEqual(['2026-08-05', '2026-09-05']);
    expect(restored.lastPaidDueDate).toBe('2026-09-05');
    expect(restored.note).toBe('Chủ nhà');
  });

  it('thu nhập định kỳ dạng object cũ không bị biến thành "một lần"', () => {
    const row = mapIncomeToDb(
      { id: 'inc-1', name: 'Lương', amount: 1, recurrence: { frequency: 'monthly', dayOfMonth: 25 }, isActive: true, createdAt: 'x', updatedAt: 'x' },
      USER_A
    );
    expect(row.recurrence).toBe('monthly');
    expect(row.type).toBe('recurring');
    expect(row.receive_day).toBe(25);
  });
});

describe('performFullSync với Supabase giả lập', () => {
  let cloud: FakeSupabase;
  let client: SupabaseClient;

  beforeEach(() => {
    store.clear();
    cloud = new FakeSupabase();
    client = cloud.asClient();
    cloud.sessionUserId = USER_A;
  });

  it('thay đổi local -> Đồng bộ ngay -> cloud được cập nhật', async () => {
    const repoA = createLocalRepositories(USER_A);
    await repoA.dataManagement.initializeWithSeedData();
    await repoA.transactions.create({ type: 'expense', amount: 45_000, categoryId: 'cat-food', date: '2026-09-14' });

    const result = await performFullSync(client, USER_A);

    expect(result.success).toBe(true);
    expect(result.uploadedCount).toBeGreaterThanOrEqual(1);
    const rows = [...cloud.tables.transactions.values()];
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ amount: 45_000, user_id: USER_A });
    expect(getLastSyncedAt(USER_A)).toBe(result.lastSyncedAt);
    expect(await hasPendingChanges(USER_A)).toBe(false);
  });

  it('thay đổi trên cloud -> Đồng bộ ngay -> local được cập nhật (đúng khóa app đọc)', async () => {
    await performFullSync(client, USER_A);
    cloud.tables.transactions.set('tx-cloud', mapTransactionToDb(newTx('tx-cloud', 99_000), USER_A));

    const result = await performFullSync(client, USER_A);

    expect(result.success).toBe(true);
    const local = await createLocalRepositories(USER_A).transactions.getAll();
    expect(local.map((t) => t.id)).toEqual(['tx-cloud']);

    // sửa trên cloud (trigger đặt updated_at mới)
    const row = cloud.tables.transactions.get('tx-cloud')!;
    cloud.tables.transactions.set('tx-cloud', { ...row, amount: 120_000, updated_at: tick() });
    await performFullSync(client, USER_A);
    expect((await createLocalRepositories(USER_A).transactions.getAll())[0].amount).toBe(120_000);
  });

  it('xóa ở một phía được lan sang phía kia, không bị "sống lại"', async () => {
    const repoA = createLocalRepositories(USER_A);
    await repoA.dataManagement.initializeWithSeedData();
    const keep = await repoA.transactions.create({ type: 'expense', amount: 1, categoryId: 'c', date: '2026-09-14' });
    const gone = await repoA.transactions.create({ type: 'expense', amount: 2, categoryId: 'c', date: '2026-09-14' });
    await performFullSync(client, USER_A);

    await repoA.transactions.delete(gone.id);
    await performFullSync(client, USER_A);
    expect(cloud.tables.transactions.has(gone.id)).toBe(false);

    cloud.tables.transactions.delete(keep.id);
    await performFullSync(client, USER_A);
    expect(await repoA.transactions.getAll()).toHaveLength(0);
  });

  it('đồng bộ lặp lại hoặc bấm chồng nhiều lần không tạo bản ghi trùng', async () => {
    const repoA = createLocalRepositories(USER_A);
    await repoA.dataManagement.initializeWithSeedData();
    await repoA.incomes.create({ name: 'Lương', amount: 20_000_000, recurrence: 'monthly', receiveDay: 25 });
    await repoA.bills.create({ name: 'Điện', amount: 500_000, categoryId: 'cat-bill', dueDate: '2026-09-20', repeat: 'monthly' });

    const [r1, r2] = await Promise.all([performFullSync(client, USER_A), performFullSync(client, USER_A)]);
    expect(r1).toBe(r2); // dùng chung một tiến trình
    await performFullSync(client, USER_A);
    await performFullSync(client, USER_A);

    expect(cloud.tables.incomes.size).toBe(1);
    expect(cloud.tables.recurring_bills.size).toBe(1);
    expect(await repoA.incomes.getAll()).toHaveLength(1);
    expect(await repoA.bills.getAll()).toHaveLength(1);
  });

  it('hóa đơn đã thanh toán ở thiết bị này không thể thanh toán lại kỳ đó sau khi đồng bộ về thiết bị khác', async () => {
    const repoA = createLocalRepositories(USER_A);
    await repoA.dataManagement.initializeWithSeedData();
    const bill = await repoA.bills.create({ name: 'Nước', amount: 100_000, categoryId: 'c', dueDate: '2026-09-10', repeat: 'monthly' });
    await repoA.bills.markAsPaid(bill.id, '2026-09-10');
    await performFullSync(client, USER_A);

    // "Thiết bị 2": xóa cache cục bộ, tải lại từ cloud
    store.clear();
    await performFullSync(client, USER_A);
    const device2 = createLocalRepositories(USER_A);
    const [pulledBill] = await device2.bills.getAll();
    expect(pulledBill.paidOccurrences).toEqual(['2026-09-10']);
    const [pulledTx] = await device2.transactions.getAll();
    expect(pulledTx.billId).toBe(bill.id);
  });

  it('lỗi ghi lên cloud -> báo thất bại, không cập nhật thời điểm đồng bộ', async () => {
    const repoA = createLocalRepositories(USER_A);
    await repoA.dataManagement.initializeWithSeedData();
    await performFullSync(client, USER_A);
    const before = getLastSyncedAt(USER_A);

    await repoA.transactions.create({ type: 'expense', amount: 7, categoryId: 'c', date: '2026-09-14' });
    cloud.failWrites = "Could not find the 'bill_id' column of 'transactions' in the schema cache";
    const result = await performFullSync(client, USER_A);

    expect(result.success).toBe(false);
    expect(result.error).toContain('bill_id');
    expect(getLastSyncedAt(USER_A)).toBe(before);
    expect(await hasPendingChanges(USER_A)).toBe(true);
  });

  it('phiên hết hạn -> thất bại, không xóa dữ liệu cục bộ dù cloud trả về rỗng', async () => {
    const repoA = createLocalRepositories(USER_A);
    await repoA.dataManagement.initializeWithSeedData();
    await repoA.transactions.create({ type: 'expense', amount: 7, categoryId: 'c', date: '2026-09-14' });
    await performFullSync(client, USER_A);

    cloud.sessionUserId = null;
    const result = await performFullSync(client, USER_A);
    expect(result.success).toBe(false);
    expect(await repoA.transactions.getAll()).toHaveLength(1);
  });

  it('hai tài khoản trên cùng thiết bị không thấy dữ liệu của nhau', async () => {
    // Khách tạo dữ liệu rồi đăng ký tài khoản A (cloud trống) -> dữ liệu khách chuyển vào A
    const guest = createLocalRepositories(null);
    await guest.dataManagement.initializeWithSeedData();
    await guest.transactions.create({ type: 'expense', amount: 30_000, categoryId: 'c', date: '2026-09-14' });

    const resultA = await performFullSync(client, USER_A);
    expect(resultA.success).toBe(true);
    expect(resultA.migratedCount).toBe(1);
    expect(await createLocalRepositories(USER_A).transactions.getAll()).toHaveLength(1);
    expect(await guest.transactions.getAll()).toHaveLength(0);

    // A đăng xuất, B đăng nhập trên cùng thiết bị
    cloud.sessionUserId = USER_B;
    const resultB = await performFullSync(client, USER_B);
    expect(resultB.success).toBe(true);
    expect(await createLocalRepositories(USER_B).transactions.getAll()).toHaveLength(0);
    expect([...cloud.tables.transactions.values()].every((r) => r.user_id === USER_A)).toBe(true);

    // B không thể ghi đè bản ghi của A dù trùng id (RLS)
    const aTx = [...cloud.tables.transactions.values()][0];
    const repoB = createLocalRepositories(USER_B);
    await repoB.transactions.replaceAll([{ ...mapTransactionFromDb(aTx), amount: 1, updatedAt: tick() }]);
    const hijack = await performFullSync(client, USER_B);
    expect(hijack.success).toBe(false);
    expect(cloud.tables.transactions.get(aTx.id)!.amount).toBe(30_000);

    // A đăng nhập lại -> dữ liệu của A vẫn còn nguyên
    cloud.sessionUserId = USER_A;
    await performFullSync(client, USER_A);
    const aLocal = await createLocalRepositories(USER_A).transactions.getAll();
    expect(aLocal).toHaveLength(1);
    expect(aLocal[0].amount).toBe(30_000);
  });

  it('tài khoản đã có dữ liệu trên cloud: settings cloud thắng settings mặc định của thiết bị mới', async () => {
    cloud.tables.user_settings.set(USER_A, {
      user_id: USER_A, starting_balance: 8_000_000, currency: 'VND', heatmap_theme: 'ocean', theme: 'dark',
      spending_levels: { lowMax: 1, mediumMax: 2 }, updated_at: '2026-09-01T00:00:00.000Z',
    });
    const result = await performFullSync(client, USER_A);
    expect(result.success).toBe(true);
    expect((await createLocalRepositories(USER_A).settings.get()).startingBalance).toBe(8_000_000);
    expect(cloud.tables.user_settings.get(USER_A)!.starting_balance).toBe(8_000_000);
  });

  it('đặt lại dữ liệu cục bộ không xóa dữ liệu trên cloud', async () => {
    const repoA = createLocalRepositories(USER_A);
    await repoA.dataManagement.initializeWithSeedData();
    await repoA.transactions.create({ type: 'expense', amount: 7, categoryId: 'c', date: '2026-09-14' });
    await performFullSync(client, USER_A);

    await repoA.dataManagement.resetAllData();
    resetSyncBase(USER_A);
    await performFullSync(client, USER_A);

    expect(cloud.tables.transactions.size).toBe(1);
    expect(await repoA.transactions.getAll()).toHaveLength(1);
  });
});
