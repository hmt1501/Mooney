# PROMPT — MOONEY PRODUCT SPECIFICATION V1

Bạn đang xây dựng một web app quản lý chi tiêu cá nhân tên **Mooney**.

## 1. PRODUCT DIRECTION

Mooney là một personal finance app lấy **Monii - Money Calendar** làm reference chính.

Mục tiêu của phiên bản đầu tiên:

> **Recreate approximately 90% of Monii's core UI, UX and functionality before adding any differentiated features.**

Không cố gắng sáng tạo lại UX ở Phase 1.

Ưu tiên:

1. UI gần Monii.
2. UX gần Monii.
3. Flow sử dụng đơn giản như Monii.
4. Calendar-first experience.
5. Mobile-first.
6. Code đơn giản, dễ mở rộng về sau.

App phải có cảm giác:

**cute + calm + friendly + trustworthy**

Không biến thành một dashboard fintech khô cứng.

---

# 2. IMPORTANT SCOPE DECISION

## KHÔNG IMPLEMENT ACCOUNT MANAGEMENT TRONG PHASE 1

Tạm thời **bỏ hoàn toàn khái niệm nhiều tài khoản ngân hàng / ví tiền**.

Không tạo:

* Bank accounts
* Cash accounts
* Wallet accounts
* Account switching
* Account balance per bank
* Account transfer
* Historical balance per account
* Bank reconciliation
* Bank synchronization

Không tạo database table `accounts`.

Không thêm `account_id` vào transaction.

---

# 3. MONEY MODEL — PHASE 1

Mooney chỉ sử dụng **một số tiền khả dụng tổng duy nhất**, tương tự cách Monii thể hiện tổng quan tiền.

Ví dụ:

```text
KHẢ DỤNG

6.390.000 đ
```

Đây là số tiền người dùng đang có/thể sử dụng trong phạm vi Mooney.

Người dùng không cần khai báo:

```text
Vietcombank: 4.000.000
MB Bank: 2.000.000
Cash: 390.000
```

Mà chỉ cần:

```text
Mooney Available Balance:
6.390.000 đ
```

Sau này Phase 2 mới có thể bổ sung:

```text
Accounts
├── Vietcombank
├── MB Bank
├── Cash
└── ...
```

Thiết kế database và code hiện tại phải đủ sạch để có thể bổ sung tính năng này sau, nhưng **không được implement nó ngay bây giờ**.

---

# 4. CORE MONEY LOGIC

Mooney cần quản lý 3 loại transaction:

```text
INCOME
EXPENSE
```

Chưa cần:

```text
TRANSFER
```

vì chưa có nhiều tài khoản.

Công thức tổng quát:

```text
Available Balance
=
Starting Balance
+ Total Income
- Total Expense
```

Ví dụ:

```text
Starting Balance = 5.000.000

Income = 10.000.000

Expense = 8.610.000

Available Balance = 6.390.000
```

Khi user thêm expense:

```text
Available Balance giảm
```

Khi user thêm income:

```text
Available Balance tăng
```

---

# 5. HOME / CALENDAR SCREEN

Đây là màn hình quan trọng nhất.

UI phải bám sát reference screenshot của Monii.

Structure:

```text
┌──────────────────────────────┐
│ Mooney              🌙       │
│ Money Calendar               │
│                              │
│      ‹  Thg 9, 2026  ›       │
│                              │
│ ┌──────────────────────────┐ │
│ │ KHẢ DỤNG                 │ │
│ │                          │ │
│ │ 6.390.000 đ              │ │
│ │                          │ │
│ │ Tốc độ chi tiêu tốt!     │ │
│ │ ...                      │ │
│ │                    mascot│ │
│ └──────────────────────────┘ │
│                              │
│ 🔥 LỊCH TÀI CHÍNH            │
│                              │
│ ┌──────────────────────────┐ │
│ │ T2 T3 T4 T5 T6 T7 CN      │ │
│ │                          │ │
│ │ calendar grid             │ │
│ │                          │ │
│ │ spending heatmap          │ │
│ │                          │ │
│ │ <100k  100-500k  >500k    │ │
│ └──────────────────────────┘ │
│                              │
│ 🧾 HÓA ĐƠN SẮP ĐẾN HẠN       │
│                              │
│ ┌──────────────────────────┐ │
│ │ empty / upcoming bills    │ │
│ └──────────────────────────┘ │
│                              │
│                         📷   │
│                         🎤   │
│                              │
│ ┌──────────────────────────┐ │
│ │ Lịch Hóa đơn Thống kê Cá nhân│
│ └──────────────────────────┘ │
└──────────────────────────────┘
```

---

# 6. AVAILABLE BALANCE CARD

Large rounded card near the top.

Display:

```text
KHẢ DỤNG

6.390.000 đ
```

Below it show a short financial insight.

Example:

```text
Tốc độ chi tiêu tốt!
Bạn đã chi 25% thu nhập tháng này.
```

The insight should initially be **rule-based**, not AI.

Examples:

```text
Tốc độ chi tiêu tốt!
```

```text
Bạn đang chi tiêu khá ổn.
```

```text
Cẩn thận! Chi tiêu tháng này đang tăng nhanh.
```

```text
Bạn đã chi tiêu nhiều hơn bình thường.
```

No LLM.

No AI API.

---

# 7. MONTH NAVIGATION

User can navigate:

```text
‹ September 2026 ›
```

Features:

* Previous month
* Next month
* Current month
* Current date highlight

Calendar must update when month changes.

---

# 8. FINANCIAL CALENDAR

The calendar is the main interaction model.

Each day can display:

```text
date
daily expense
heat level
income indicator
```

Example:

```text
        T2       T3       T4

         1        2        3
                120k

         4        5        6
        50k              680k
```

Spending intensity should be visually represented.

Initial thresholds:

```text
LOW       < 100.000
MEDIUM    100.000 - 500.000
HIGH      > 500.000
```

Make thresholds configurable later.

---

# 9. CALENDAR INTERACTIONS

## Single tap

Tap a date:

```text
→ open Daily Detail
```

Daily Detail shows:

```text
Ngày 13/09

Tổng chi:
350.000 đ

Thu nhập:
0 đ

Transactions:

🍜 Ăn uống
150.000 đ

🚌 Đi lại
50.000 đ

🎮 Giải trí
150.000 đ
```

---

## Double tap

Double tap a date:

```text
→ Create Expense
```

Pre-fill:

```text
Date = selected date
Type = Expense
```

This interaction should mimic the convenience of Monii.

---

# 10. ADD TRANSACTION

Transaction creation should be extremely simple.

Fields:

```text
Type
Amount
Category
Date
Note
```

Type:

```text
Expense
Income
```

Expense example:

```text
Số tiền
150.000

Danh mục
Ăn uống

Ngày
13/09/2026

Ghi chú
Ăn trưa
```

Income example:

```text
Số tiền
10.000.000

Danh mục
Lương

Ngày
01/09/2026
```

Do not add account selection.

Do not add bank selection.

Do not add transfer.

---

# 11. CATEGORIES

Create a simple default category system.

Expense:

```text
Ăn uống
Đi lại
Mua sắm
Giải trí
Hóa đơn
Sức khỏe
Giáo dục
Nhà cửa
Khác
```

Income:

```text
Lương
Thưởng
Freelance
Đầu tư
Khác
```

Categories must be editable later.

---

# 12. STATISTICS

Bottom navigation:

```text
Lịch
Hóa đơn
Thống kê
Cá nhân
```

Statistics screen must follow Monii's philosophy:

```text
Monthly spending
        ↓
Category breakdown
        ↓
Interactive chart
        ↓
Category detail
```

Display:

### Total spending

```text
Chi tiêu tháng này

8.610.000 đ
```

### Pie chart

Example:

```text
Ăn uống      35%
Mua sắm      20%
Đi lại       15%
Giải trí     10%
Khác         20%
```

---

# 13. CATEGORY DRILL-DOWN

This is one of Mooney's first small extensions.

When user taps:

```text
Ăn uống
```

open:

```text
ĂN UỐNG

Tổng:
3.010.000 đ

Transactions:

13/09
Ăn trưa          150.000

12/09
Cafe              60.000

10/09
Ăn tối            200.000

08/09
Ăn trưa           80.000
```

User should be able to see exactly:

> "Trong danh mục này tôi đã tiêu tiền vào những gì?"

This must be implemented in Phase 1.

---

# 14. MONTHLY RECAP

At the bottom of Statistics:

```text
MONTHLY RECAP
```

Show:

```text
Savings Rate
Top Spending Day
Cash Kept
Total Income
Total Expense
```

Example:

```text
Tỷ lệ tiết kiệm
35%

Ngày chi nhiều nhất
13/09

Tiền giữ lại
3.500.000 đ
```

---

# 15. SAFE DAILY SPENDING

Implement a simplified version of Monii's Safe Daily Spending concept.

Formula:

```text
Safe Daily Spending
=
Remaining Available Money
/
Remaining Days
```

Example:

```text
Available:
6.390.000

Remaining days:
17

Safe daily spending:
375.882 đ/day
```

Display this as a small insight/card.

Later this can be improved to account for fixed commitments and recurring bills.

Monii itself positions this as a core feature for estimating how much can safely be spent each day. ([App Store][1])

---

# 16. BILLS

Bottom navigation:

```text
Hóa đơn
```

Implement recurring bills.

Fields:

```text
Name
Amount
Due Date
Repeat
Category
Note
```

Repeat:

```text
Never
Weekly
Monthly
Yearly
```

Examples:

```text
Tiền điện
Netflix
Internet
Tiền nhà
Gym
Spotify
```

Show:

```text
3 ngày nữa
```

```text
7 ngày nữa
```

```text
Hôm nay
```

Use countdown style similar to Monii.

---

# 17. PERSONAL / SETTINGS

Screen:

```text
Cá nhân
```

Include:

```text
Thông tin cá nhân
Tiền tệ
Giao diện
Dark Mode
Heatmap Theme
Danh mục
Thông báo
Dữ liệu
```

Currency default:

```text
VND
```

---

# 18. DARK MODE

Implement:

```text
Light Mode
Dark Mode
```

But do not redesign the UI.

Dark mode must preserve:

* same hierarchy
* same spacing
* same rounded cards
* same visual identity
* same green accent

---

# 19. FLOATING BUTTONS

Keep the floating buttons from the reference UI:

```text
Camera
Microphone
```

However:

### Phase 1

They can be:

```text
disabled / placeholder
```

Do NOT implement:

* OCR
* receipt scanning
* speech recognition
* AI parsing

The buttons exist primarily to preserve the UI structure for future development.

---

# 20. MASCOT

Mooney should have its own mascot/illustration style.

Do not simply copy Monii's mascot.

The visual role should be similar:

```text
happy
normal
good spending
warning
high spending
empty state
success
```

The mascot is part of Mooney's identity.

---

# 21. DATA MODEL — PHASE 1

Keep the database simple.

```text
users
settings
transactions
categories
recurring_bills
```

### transactions

```text
id
type
amount
category_id
date
note
created_at
updated_at
```

### categories

```text
id
name
type
icon
color
is_active
created_at
```

### recurring_bills

```text
id
name
amount
category_id
due_date
repeat_frequency
note
is_active
created_at
updated_at
```

### settings

```text
id
currency
theme
heatmap_theme
starting_balance
created_at
updated_at
```

---

# 22. STARTING BALANCE

Since there is no account system yet, the user simply enters:

```text
Số dư ban đầu
```

Example:

```text
Số dư ban đầu:
5.000.000 đ
```

This is the starting point for calculating:

```text
Available Balance
```

Formula:

```text
Available Balance
=
Starting Balance
+
Income
-
Expense
```

Do not call this an "account balance".

Call it:

```text
Số tiền khả dụng
```

or internally:

```text
availableBalance
```

---

# 23. IMPORTANT FUTURE EXTENSION

Design the code so that later we can introduce:

```text
accounts
```

without rewriting the entire application.

Future architecture:

```text
Mooney Phase 1

Global Balance
     ↓
Transactions


Mooney Phase 2

Accounts
├── Vietcombank
├── MB Bank
├── Cash
└── Wallet

Transactions
     ↓
account_id
```

But **DO NOT implement Phase 2 now**.

Do not create UI placeholders for accounts.

Do not create account management screens.

Do not create account database tables.

---

# 24. PHASE 1 EXCLUSIONS

Strictly do NOT implement:

```text
AI
AI chatbot
LLM
Voice expense input
OCR
Receipt scanning
Bank API
Automatic bank synchronization
Multiple accounts
Bank reconciliation
Historical account balance
Investment
Debt management
Credit cards
Family accounts
Social features
Gamification
Complex budgeting
```

The goal is to finish a clean MVP quickly.

---

# 25. UI REFERENCE

Use the provided Monii screenshot as the primary UI reference.

Important visual characteristics:

* warm off-white background
* dark botanical green
* sage green
* pale green
* orange warning
* red danger
* rounded cards
* soft shadows
* large spacing
* friendly typography
* cute illustrations
* compact calendar
* bottom navigation inside rounded container
* floating action buttons
* mobile-first layout

Do NOT turn the UI into:

* generic Tailwind dashboard
* generic SaaS dashboard
* banking dashboard
* Material Design clone
* overly minimalist black/white fintech UI

Target:

> **Mooney should immediately feel like the same product category and UX philosophy as Monii, while still having its own branding.**

---

# 26. TECHNICAL DIRECTION

Use:

```text
Next.js
React
TypeScript
Tailwind CSS
shadcn/ui
Recharts
Supabase
Vercel
PWA
```

Mobile-first.

The application must work well on:

```text
iPhone Safari
Desktop Chrome
```

Primary design target:

```text
iPhone viewport
```

Desktop should simply provide a centered mobile-style application container rather than turning the app into a desktop enterprise dashboard.

---

# 27. DEVELOPMENT PRIORITY

Implement in this order:

```text
1. App shell
2. Bottom navigation
3. Home / Calendar
4. Available Balance
5. Calendar heatmap
6. Add Expense
7. Add Income
8. Daily Detail
9. Statistics
10. Category Drill-down
11. Bills
12. Settings
13. Dark Mode
14. PWA
15. Polish animations / empty states / loading states
```

Do not start with advanced architecture.

Do not over-engineer.

Get the main user flow working first:

```text
Open Mooney
      ↓
See available money
      ↓
See monthly calendar
      ↓
Tap a day
      ↓
See transactions
      ↓
Add expense
      ↓
Calendar updates
      ↓
Available balance updates
      ↓
Statistics update
```

---

# 28. SUCCESS CRITERIA

Phase 1 is considered complete when a user can:

```text
✓ Open Mooney
✓ See available balance
✓ Set starting balance
✓ Navigate months
✓ See monthly spending calendar
✓ See spending heatmap
✓ Add expense
✓ Add income
✓ Tap a day
✓ View daily transactions
✓ Double-tap a day to add expense
✓ See statistics
✓ Click category
✓ See transactions inside category
✓ Create recurring bills
✓ See upcoming bills
✓ Change theme
✓ Use dark mode
✓ Use Mooney comfortably on iPhone
```

Most importantly:

> **Do not add account management yet.**

The first milestone is simply:

**"Make Mooney feel like Monii, but with our own name and foundation for future development."**

[1]: https://apps.apple.com/vn/app/monii-money-calendar/id6803572087?utm_source=chatgpt.com "‎Monii - Money Calendar App - App Store"

Phần 2:Design System V1 Đúng. Sau khi chốt **Product Specification V1**, bước tiếp theo nên là **Design System V1** trước khi cho AI agent code UI. Mục tiêu là tránh việc agent tự “sáng tạo” thành một app fintech khác với screenshot.

Monii hiện xác định các đặc điểm cốt lõi là calendar-first, heat-level spending, safe-to-spend, recurring bills, statistics và Light/Dark Mode; vì vậy Design System dưới đây sẽ bám đúng những trục đó. ([App Store][1])

Dưới đây là **production prompt** bạn có thể copy nguyên khối cho Claude Code / Cursor / Codex / Gemini Coding Agent.

---

