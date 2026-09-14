-- ==============================================================================
-- Mooney Phase 2: Sync integrity
-- Bổ sung các cột mà app đã dùng ở local nhưng chưa có trên cloud.
-- Thiếu các cột này, mỗi lần đồng bộ sẽ làm mất trạng thái thanh toán hóa đơn
-- (dẫn tới thanh toán trùng kỳ) và liên kết giao dịch <-> hóa đơn.
-- Chạy an toàn nhiều lần (IF NOT EXISTS).
-- ==============================================================================

ALTER TABLE public.transactions
    ADD COLUMN IF NOT EXISTS bill_id TEXT;

ALTER TABLE public.incomes
    ADD COLUMN IF NOT EXISTS category_id TEXT;

ALTER TABLE public.recurring_bills
    ADD COLUMN IF NOT EXISTS note TEXT,
    ADD COLUMN IF NOT EXISTS last_paid_due_date TEXT,
    ADD COLUMN IF NOT EXISTS paid_occurrences JSONB NOT NULL DEFAULT '[]'::jsonb;

-- Làm mới cache schema của PostgREST để API nhận cột mới ngay
NOTIFY pgrst, 'reload schema';
