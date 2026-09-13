# PROMPT — MOONEY UI/UX SCREEN SPECIFICATION V1

```text
You are the Senior Product Designer and UX Architect for MOONEY.

Your task is to create the complete UI/UX SCREEN SPECIFICATION V1 for Mooney.

IMPORTANT:

This is NOT a generic UX exercise.

Mooney is intentionally designed to be approximately 90% similar to the Monii - Money Calendar experience in Phase 1.

The supplied Monii screenshot is the PRIMARY visual and structural reference.

The previously created:

/design/design-system.md
/design/tokens.md
/design/components.md

must be treated as the source of truth for visual styling.

This document defines:

WHERE components appear,
WHAT information is shown,
HOW users navigate,
WHAT happens after each interaction,
WHAT each screen should prioritize.

Do NOT write application code yet.

==================================================
1. PRODUCT GOAL
==================================================

Product name:

MOONEY

Product type:

Mobile-first personal expense management web app / PWA.

Primary target:

iPhone-sized mobile viewport.

Secondary target:

Desktop browser.

The desktop experience should still feel like a mobile personal finance application rather than a desktop enterprise dashboard.

Core product philosophy:

"See where my money goes at a glance."

The primary interaction model is:

Calendar → Day → Transaction

The user should be able to understand their financial situation within a few seconds after opening the app.

==================================================
2. PHASE 1 SCOPE
==================================================

Phase 1 intentionally keeps the product simple.

Mooney has ONE global available balance.

There is NO account system.

DO NOT design:

- Bank accounts
- Cash accounts
- Wallets
- Multiple balances
- Account switching
- Transfers
- Bank reconciliation
- Historical account balances
- Bank API
- Automatic bank synchronization

Money model:

Starting Balance
+
Income
-
Expense
=
Available Balance

Transaction types:

- Expense
- Income

==================================================
3. PHASE 1 NAVIGATION
==================================================

Primary bottom navigation:

1. Lịch
2. Hóa đơn
3. Thống kê
4. Cá nhân

Default screen:

Lịch

Navigation must persist across the main screens.

The active tab must always be visually obvious.

Do not introduce additional primary navigation items.

==================================================
4. INFORMATION ARCHITECTURE
==================================================

Define the following screen hierarchy:

MOONEY
│
├── Lịch
│   ├── Calendar Home
│   ├── Daily Detail
│   ├── Add Expense
│   └── Add Income
│
├── Hóa đơn
│   ├── Bills Home
│   ├── Add Bill
│   ├── Edit Bill
│   └── Bill Detail
│
├── Thống kê
│   ├── Statistics Home
│   ├── Category Detail
│   └── Transaction Detail
│
└── Cá nhân
    ├── Profile / Settings Home
    ├── Currency
    ├── Theme
    ├── Heatmap Theme
    ├── Categories
    ├── Notifications
    └── Data

Also define:

- Empty states
- Loading states
- Error states
- Confirmation states
- Bottom sheets
- Modals
- Toasts

==================================================
5. GLOBAL UX RULE
==================================================

Every screen must answer:

1. Where am I?
2. What is the most important information here?
3. What is the primary action?
4. How do I go back?
5. What happens when I tap the important elements?

Do not make users search for the main action.

==================================================
6. SCREEN 01 — CALENDAR HOME
==================================================

Route:

/

Navigation:

Lịch

This is the MOST IMPORTANT screen in the application.

Priority:

★★★★★

The screen should closely reproduce the structure of the provided Monii screenshot.

--------------------------------------------------
6.1 SCREEN STRUCTURE
--------------------------------------------------

Vertical order:

1. App Header
2. Month Selector
3. Available Balance Card
4. Safe Daily Spending / financial insight
5. Financial Calendar
6. Upcoming Bills
7. Floating Actions
8. Bottom Navigation

The user should see the most important financial information without navigating away.

--------------------------------------------------
6.2 HEADER
--------------------------------------------------

Top area:

Mooney
Money Calendar

Right:

Theme / Moon button

The header should be compact.

Do not use a large marketing-style header.

Interaction:

Tap theme button:

→ toggle Light / Dark Mode

--------------------------------------------------
6.3 MONTH SELECTOR
--------------------------------------------------

Example:

‹     Thg 9, 2026     ›

Interactions:

Tap left:

→ previous month

Tap right:

→ next month

Tap month label:

OPTIONAL future enhancement:
→ month picker

For Phase 1, a simple month navigation is sufficient.

When month changes:

- calendar updates
- monthly statistics context updates
- upcoming bills context updates
- spending summary updates

Do not reload the entire application unnecessarily.

--------------------------------------------------
6.4 AVAILABLE BALANCE CARD
--------------------------------------------------

Main card:

KHẢ DỤNG

6.390.000 đ

Below:

Tốc độ chi tiêu tốt!

You have spent approximately 25% of this month's income.

The exact copy may be localized later.

The balance is the most important numeric element on the screen.

--------------------------------------------------
6.5 BALANCE CARD INTERACTION
--------------------------------------------------

Tap/edit icon:

→ Open Starting Balance / Money Settings

User can modify:

Số dư ban đầu

The user does NOT manage bank accounts here.

Do not display account information.

--------------------------------------------------
6.6 FINANCIAL INSIGHT
--------------------------------------------------

Below or inside the balance card:

Rule-based financial insight.

Examples:

"Tốc độ chi tiêu tốt!"

"Bạn đang chi tiêu khá ổn."

"Chi tiêu tháng này đang tăng nhanh."

"Bạn đã chi nhiều hơn bình thường."

These are NOT AI-generated.

Do not mention AI.

--------------------------------------------------
6.7 SAFE DAILY SPENDING
--------------------------------------------------

Show:

Bạn có thể chi khoảng

375.882 đ/ngày

This should be visually secondary to the available balance.

Calculation:

Remaining Available Money
/
Remaining Days

For Phase 1 this can be simplified.

The UI should communicate:

"This is an indication, not a strict budget."

--------------------------------------------------
6.8 FINANCIAL CALENDAR
--------------------------------------------------

Section title:

LỊCH TÀI CHÍNH

Use a small visual accent/icon.

Calendar:

T2 T3 T4 T5 T6 T7 CN

Each day:

Date
Daily spending
Optional heat indicator

Example:

13
350k

The calendar must remain the central visual element of the page.

--------------------------------------------------
6.9 CALENDAR INTERACTION
--------------------------------------------------

SINGLE TAP:

Tap a day.

→ Open Daily Detail bottom sheet.

DOUBLE TAP:

Double tap a day.

→ Open Add Expense.

Pre-filled:

Date = selected date
Type = Expense

This interaction is intentionally inspired by Monii.

--------------------------------------------------
6.10 TODAY
--------------------------------------------------

Today should have a distinctive visual state.

Use:

- subtle green outline
OR
- soft green background

Do NOT use:

- giant badge
- excessive animation
- bright red

--------------------------------------------------
6.11 SELECTED DATE
--------------------------------------------------

Selected date:

Show clearly.

If user taps another day:

→ previous selection disappears
→ new date becomes selected
→ Daily Detail opens

--------------------------------------------------
6.12 DAILY SPENDING HEATMAP
--------------------------------------------------

Initial thresholds:

LOW:
< 100.000

MEDIUM:
100.000–500.000

HIGH:
> 500.000

Use Design System heat colors.

Do not make high spending visually aggressive.

--------------------------------------------------
6.13 INCOME DAY
--------------------------------------------------

If a day contains income:

Show a distinct income indicator.

Example:

13
+10tr

Use the designated income color.

Income must visually differ from expense.

--------------------------------------------------
6.14 CALENDAR LEGEND
--------------------------------------------------

Bottom of calendar:

Mức chi tiêu:

<100k
100k–500k
>500k

Keep it compact.

--------------------------------------------------
6.15 UPCOMING BILLS
--------------------------------------------------

Section:

HÓA ĐƠN SẮP ĐẾN HẠN

If no bills:

Show:

Không có hóa đơn nào sắp đến hạn trong tháng này.

With an appropriate empty illustration.

If bills exist:

Example:

Netflix
159.000 đ
3 ngày nữa

Internet
200.000 đ
7 ngày nữa

Tap bill:

→ Bill Detail

Tap section header:

→ Bills Home

--------------------------------------------------
6.16 FLOATING ACTIONS
--------------------------------------------------

Right side:

Camera
Microphone

Phase 1:

These can remain disabled / placeholder.

Do NOT implement:

- OCR
- receipt scanning
- voice parsing
- AI

The visual elements exist for future expansion and to preserve the intended UI structure.

==================================================
7. SCREEN 02 — DAILY DETAIL
==================================================

Trigger:

Tap calendar day.

Preferred implementation:

Bottom Sheet.

Example:

13/09/2026

Tổng chi
350.000 đ

Thu nhập
0 đ

Transactions

--------------------------------------------------
7.1 DAILY SUMMARY
--------------------------------------------------

Show:

Total Expense
Total Income

Optional:

Net Change

Example:

Chi:
350.000 đ

Thu:
0 đ

--------------------------------------------------
7.2 TRANSACTION LIST
--------------------------------------------------

Each transaction:

Icon
Category
Note
Time
Amount

Example:

Ăn uống
Ăn trưa

-150.000 đ

Đi lại
Grab

-50.000 đ

--------------------------------------------------
7.3 TRANSACTION INTERACTION
--------------------------------------------------

Tap transaction:

→ Transaction Detail / Edit

Swipe or menu:

→ Edit
→ Delete

For delete:

Require confirmation.

Example:

Xóa khoản chi này?

Hủy
Xóa

--------------------------------------------------
7.4 EMPTY DAILY STATE
--------------------------------------------------

If no transaction:

Hôm nay chưa có giao dịch.

Primary action:

+ Thêm khoản chi

Secondary:

+ Thêm thu nhập

==================================================
8. SCREEN 03 — ADD EXPENSE
==================================================

Trigger:

- Double tap calendar date
- Add button from Daily Detail
- Future global add action

Preferred UI:

Bottom Sheet.

--------------------------------------------------
8.1 DEFAULT STATE
--------------------------------------------------

Type:

CHI TIÊU

Amount:

0 đ

Category:

Chọn danh mục

Date:

13/09/2026

Note:

Ghi chú

Primary CTA:

Lưu khoản chi

--------------------------------------------------
8.2 AMOUNT INPUT
--------------------------------------------------

Amount must be the visual focus.

When opening:

Cursor/focus should preferably be on amount input.

User should be able to quickly type:

150000

and see:

150.000 đ

Do not force unnecessary fields.

--------------------------------------------------
8.3 CATEGORY
--------------------------------------------------

Tap category:

→ Category selector.

Categories:

Ăn uống
Đi lại
Mua sắm
Giải trí
Hóa đơn
Sức khỏe
Giáo dục
Nhà cửa
Khác

Category selector should use:

icon + name

not a dense dropdown.

--------------------------------------------------
8.4 DATE
--------------------------------------------------

Default:

selected calendar date.

User can change date.

--------------------------------------------------
8.5 NOTE
--------------------------------------------------

Optional.

Do not force note input.

Placeholder:

Ghi chú...

--------------------------------------------------
8.6 SAVE
--------------------------------------------------

Tap:

Lưu khoản chi

Then:

1. Validate amount.
2. Save transaction.
3. Update calendar.
4. Update available balance.
5. Update statistics.
6. Update relevant bill/statistic state if applicable.
7. Close sheet.
8. Show success toast.

Toast:

Đã thêm khoản chi.

==================================================
9. SCREEN 04 — ADD INCOME
==================================================

Same interaction model as Add Expense.

Differences:

Type:

THU NHẬP

Categories:

Lương
Thưởng
Freelance
Đầu tư
Khác

Primary CTA:

Lưu khoản thu

After save:

- balance increases
- calendar updates
- statistics update
- toast appears

==================================================
10. SCREEN 05 — EDIT TRANSACTION
==================================================

Trigger:

Daily Detail
→ Tap transaction
→ Edit

Reuse Add Expense / Add Income form.

Pre-fill:

- amount
- category
- date
- note
- type

Primary CTA:

Lưu thay đổi

Secondary destructive action:

Xóa giao dịch

Delete requires confirmation.

==================================================
11. SCREEN 06 — BILLS HOME
==================================================

Route:

/bills

Bottom navigation:

Hóa đơn

Screen structure:

Header:

HÓA ĐƠN

Primary action:

+ Thêm hóa đơn

Then:

Upcoming
Active recurring bills
Optional past bills

--------------------------------------------------
11.1 UPCOMING SECTION
--------------------------------------------------

Sort by due date.

Example:

Hôm nay
Internet
200.000 đ

3 ngày nữa
Netflix
159.000 đ

7 ngày nữa
Gym
300.000 đ

--------------------------------------------------
11.2 BILL CARD
--------------------------------------------------

Each card:

Icon
Name
Amount
Due date
Countdown
Repeat frequency

Example:

Netflix
159.000 đ
3 ngày nữa
Hàng tháng

Tap:

→ Bill Detail

==================================================
12. SCREEN 07 — ADD BILL
==================================================

Fields:

Tên hóa đơn
Số tiền
Ngày đến hạn
Lặp lại
Danh mục
Ghi chú

Repeat options:

Không lặp
Hàng tuần
Hàng tháng
Hàng năm

Primary:

Lưu hóa đơn

==================================================
13. SCREEN 08 — BILL DETAIL
==================================================

Display:

Netflix

159.000 đ

Ngày đến hạn:
15/09/2026

Lặp lại:
Hàng tháng

Countdown:

3 ngày nữa

Actions:

Chỉnh sửa
Xóa

Optional:

Mark as paid

If "Mark as paid" is implemented, it should create an expense transaction.

Do NOT automatically create expenses without a clear user action.

==================================================
14. SCREEN 09 — STATISTICS HOME
==================================================

Route:

/statistics

Bottom navigation:

Thống kê

This screen should feel personal.

Do NOT create an enterprise analytics dashboard.

--------------------------------------------------
14.1 HEADER
--------------------------------------------------

Thống kê

Month selector:

‹ Thg 9, 2026 ›

--------------------------------------------------
14.2 MAIN SPENDING SUMMARY
--------------------------------------------------

Show:

Chi tiêu tháng này

8.610.000 đ

Secondary:

Thu nhập
10.000.000 đ

Tiền giữ lại
1.390.000 đ

--------------------------------------------------
14.3 CATEGORY BREAKDOWN
--------------------------------------------------

Show:

Pie / Donut chart

Categories:

Ăn uống
Mua sắm
Đi lại
Giải trí
Khác

Each category should have:

color
icon
name
amount
percentage

--------------------------------------------------
14.4 CATEGORY INTERACTION
--------------------------------------------------

IMPORTANT:

The chart and category list are interactive.

Tap:

Ăn uống

→ Category Detail

This is a core Mooney feature.

==================================================
15. SCREEN 10 — CATEGORY DETAIL
==================================================

Example:

ĂN UỐNG

3.010.000 đ

35% tổng chi tiêu

Then transaction list:

13/09
Ăn trưa
150.000 đ

12/09
Cafe
60.000 đ

10/09
Ăn tối
200.000 đ

--------------------------------------------------
15.1 CATEGORY FILTER
--------------------------------------------------

Phase 1:

Current month by default.

Optional filter:

Month

Do NOT add excessive filtering.

Future:

Day
Week
Month
Custom range

can be added later.

--------------------------------------------------
15.2 TRANSACTION INTERACTION
--------------------------------------------------

Tap transaction:

→ Transaction Detail / Edit

==================================================
16. SCREEN 11 — MONTHLY RECAP
==================================================

Can be part of Statistics Home.

Section:

TỔNG KẾT THÁNG

Metrics:

Tỷ lệ tiết kiệm

35%

Ngày chi nhiều nhất

13/09

Tiền giữ lại

3.500.000 đ

Tổng thu

10.000.000 đ

Tổng chi

6.500.000 đ

Use compact cards.

Do not make every metric a giant card.

==================================================
17. SCREEN 12 — SAFE DAILY SPENDING
==================================================

This can appear on:

Calendar Home

and optionally:

Statistics

Display:

Bạn có thể chi khoảng

375.882 đ/ngày

Calculation:

Remaining available money
/
remaining days

The component should explain the value briefly.

Example:

"Mức chi gợi ý mỗi ngày để bạn giữ được số dư đến cuối tháng."

==================================================
18. SCREEN 13 — PERSONAL / SETTINGS
==================================================

Route:

/profile

Bottom navigation:

Cá nhân

Structure:

Header:

Cá nhân

Sections:

THIẾT LẬP TIỀN
- Số dư ban đầu
- Tiền tệ

GIAO DIỆN
- Chế độ sáng/tối
- Heatmap theme

DỮ LIỆU
- Danh mục
- Thông báo
- Dữ liệu

ABOUT
- About Mooney
- Version

Do NOT include:

Accounts

Banks

AI

Advanced financial tools

==================================================
19. SCREEN 14 — STARTING BALANCE
==================================================

User can edit:

Số dư ban đầu

Example:

5.000.000 đ

Show explanation:

"Số tiền bạn có khi bắt đầu sử dụng Mooney."

Primary:

Lưu

After save:

Available Balance recalculates.

==================================================
20. SCREEN 15 — CATEGORY MANAGEMENT
==================================================

Show:

Chi tiêu

Ăn uống
Đi lại
Mua sắm
Giải trí
...

Thu nhập

Lương
Thưởng
Freelance
...

Actions:

Add
Edit
Delete

Deleting a category with existing transactions must require a safe migration decision.

Do not silently delete transaction history.

==================================================
21. SCREEN 16 — THEME SETTINGS
==================================================

Options:

Light
Dark
System

Default:

System or Light depending on implementation.

Switching theme should happen immediately.

No page reload if possible.

==================================================
22. SCREEN 17 — HEATMAP THEME
==================================================

Phase 1 can include a small selection.

Example:

Classic
Forest
Ocean

Do not implement 10+ themes yet unless trivial.

The important thing is the architecture supports themes later.

==================================================
23. SCREEN 18 — EMPTY STATES
==================================================

Every major screen must have a deliberate empty state.

Calendar:

No transactions.

Bills:

No upcoming bills.

Statistics:

No spending data.

Category:

No transactions in category.

Profile:

Never use empty states where a settings row is more appropriate.

Empty state structure:

Illustration
Title
Explanation
Optional CTA

==================================================
24. SCREEN 19 — LOADING STATES
==================================================

When data loads:

Use skeletons matching the final layout.

Home:

Balance skeleton
Calendar skeleton
Bills skeleton

Statistics:

Summary skeleton
Chart skeleton
Category skeleton

Avoid giant loading spinners.

==================================================
25. SCREEN 20 — ERROR STATES
==================================================

Example:

Không thể tải dữ liệu.

Thử lại

Error states must:

- explain what happened
- offer recovery
- avoid technical jargon

==================================================
26. GLOBAL INTERACTION MODEL
==================================================

Define the following gestures/interactions.

TAP:

Normal navigation / selection.

DOUBLE TAP:

Calendar day → Add Expense.

SWIPE:

Optional horizontal month navigation.

For Phase 1:

Arrow navigation is required.

Swipe is optional.

LONG PRESS:

Do NOT introduce unless clearly necessary.

SWIPE TO DELETE:

Optional.

A visible delete action is safer.

==================================================
27. NAVIGATION BEHAVIOR
==================================================

Bottom navigation should preserve each tab's state when possible.

Example:

User:

Lịch
→ September
→ selects 13/09

Navigates:

Thống kê

Then returns:

Lịch

The app should preferably preserve:

September
13/09 selection

Do not unexpectedly reset the user to the current month.

==================================================
28. BACK BEHAVIOR
==================================================

Mobile browser:

Back should behave naturally.

Bottom sheet:

Back → close sheet

Modal:

Back → close modal

Nested screen:

Back → previous screen

Do not unexpectedly navigate the user out of the application.

==================================================
29. FORM VALIDATION
==================================================

Expense:

Amount required.

Category required.

Date required.

Note optional.

Income:

Amount required.

Category required.

Date required.

Bill:

Name required.

Amount required.

Due date required.

Repeat required.

Validation messages should be short.

Example:

Vui lòng nhập số tiền.

Vui lòng chọn danh mục.

==================================================
30. DELETE BEHAVIOR
==================================================

Never delete important financial data immediately.

Confirmation:

Xóa giao dịch?

Bạn có chắc muốn xóa khoản chi này?

Actions:

Hủy
Xóa

After delete:

- update balance
- update calendar
- update statistics
- update category totals
- show toast

==================================================
31. RESPONSIVE SCREEN RULES
==================================================

Primary:

320–430px

Secondary:

431–768px

Desktop:

769px+

Mobile:

Full application width.

Desktop:

Centered app shell.

Do not transform the calendar into a desktop dashboard.

Do not add extra desktop-only widgets in Phase 1.

==================================================
32. SCREEN PRIORITY
==================================================

Rank screens by importance.

P0:

Calendar Home
Daily Detail
Add Expense
Add Income

P1:

Statistics
Category Detail
Bills Home
Add Bill

P2:

Profile
Settings
Category Management
Theme Settings

P3:

Advanced polish

==================================================
33. PRIMARY USER JOURNEYS
==================================================

JOURNEY 1 — CHECK MONEY

Open app

→ See Available Balance

→ See Safe Daily Spending

→ See calendar

DONE

This should take approximately:

2–5 seconds.

--------------------------------------------------

JOURNEY 2 — RECORD EXPENSE

Open app

→ Double tap date

→ Enter amount

→ Select category

→ Save

→ Calendar updates

→ Balance updates

DONE

This should be extremely fast.

--------------------------------------------------

JOURNEY 3 — INSPECT A DAY

Open app

→ Tap date

→ Daily Detail

→ See all transactions

DONE

--------------------------------------------------

JOURNEY 4 — UNDERSTAND SPENDING

Open app

→ Thống kê

→ See category breakdown

→ Tap category

→ See transactions

DONE

--------------------------------------------------

JOURNEY 5 — CHECK UPCOMING BILL

Open app

→ Hóa đơn

→ See upcoming bill

→ Tap bill

→ See details

DONE

==================================================
34. HOME SCREEN INFORMATION HIERARCHY
==================================================

Priority order:

1. Available Balance
2. Current Month
3. Calendar
4. Today's / selected day's spending
5. Safe Daily Spending
6. Upcoming Bills
7. Secondary actions

Never reverse this hierarchy.

For example:

Do NOT put:

"Upcoming Bills"

above:

"Available Balance"

==================================================
35. STATISTICS INFORMATION HIERARCHY
==================================================

Priority:

1. Total spending
2. Total income / money kept
3. Category breakdown
4. Category drill-down
5. Monthly recap

Do not put secondary analytics before total spending.

==================================================
36. BILLS INFORMATION HIERARCHY
==================================================

Priority:

1. Due today / overdue
2. Upcoming bills
3. Recurring frequency
4. Historical / inactive bills

==================================================
37. MICROCOPY RULES
==================================================

Mooney copy should be:

short
friendly
human
non-judgmental

Good:

"Bạn đang chi tiêu khá ổn."

"Tốc độ chi tiêu tốt!"

"Chưa có khoản chi nào."

Avoid:

"WARNING: EXCESSIVE EXPENDITURE"

"Financial Risk Detected"

"Budget Violation"

The application should not shame the user.

==================================================
38. FINANCIAL FEEDBACK
==================================================

Use positive language where possible.

Expense saved:

"Đã thêm khoản chi."

Income saved:

"Đã thêm khoản thu."

Bill saved:

"Đã thêm hóa đơn."

Delete:

"Đã xóa giao dịch."

Do not use celebratory gamification.

==================================================
39. AI CODING AGENT RULES
==================================================

Before implementing any screen:

READ:

/design/design-system.md
/design/tokens.md
/design/components.md
/design/ui-rules.md
/ux/screen-spec.md

Then implement according to the screen specification.

Do NOT invent:

- new colors
- new typography
- new navigation
- new card styles
- new button styles
- new spacing
- new interaction patterns

If a required pattern does not exist:

1. Reuse the closest existing pattern.
2. Extend the existing component.
3. Document the extension.

==================================================
40. COMPONENT REUSE
==================================================

Screens must be composed from reusable components.

For example:

Calendar Home:

AppShell
→ Header
→ MonthSelector
→ AvailableBalanceCard
→ SafeDailySpendingCard
→ FinancialCalendar
→ BillsPreview
→ FloatingActions
→ BottomNavigation

Do not create one giant page component.

==================================================
41. ROUTE STRUCTURE
==================================================

Recommended conceptual route structure:

/

Calendar Home

/bills

Bills Home

/bills/new

Add Bill

/bills/[id]

Bill Detail

/statistics

Statistics

/statistics/category/[id]

Category Detail

/profile

Profile

/settings/categories

Category Settings

/settings/theme

Theme Settings

Actual route structure may be adapted to the chosen framework.

==================================================
42. SCREEN SPEC FORMAT
==================================================

For EVERY screen, document:

1. Screen name
2. Route
3. Purpose
4. Entry points
5. Exit points
6. Layout
7. Information hierarchy
8. Components used
9. Primary CTA
10. Secondary actions
11. Interactions
12. Navigation behavior
13. Loading state
14. Empty state
15. Error state
16. Success feedback
17. Responsive behavior
18. Accessibility
19. Edge cases

==================================================
43. EDGE CASES
==================================================

The UI specification must explicitly handle:

Zero balance

Negative balance

No income

No expense

Very large numbers

Very long category names

Very long notes

31-day months

February

Leap years

Month with no transactions

Month with only income

Month with only expenses

Multiple transactions on same day

Many transactions on same day

No bills

Many bills

Overdue bills

Bill due today

Very long bill names

No statistics

Deleted category with transactions

==================================================
44. NEGATIVE BALANCE
==================================================

If:

Available Balance < 0

Do not break the layout.

Show:

- clear negative value
- calm warning state
- appropriate financial insight

Example:

-500.000 đ

"Bạn đã chi vượt số tiền khả dụng."

Do not make the entire interface red.

==================================================
45. VERY LARGE MONEY VALUES
==================================================

The UI must handle:

1.000.000.000 đ

without overflowing cards.

Large numbers may reduce font size responsively.

Do not truncate important financial values.

==================================================
46. MANY TRANSACTIONS
==================================================

Daily Detail:

Maximum visible content should remain manageable.

Use scrolling.

Do not render an infinite list without a reasonable container.

==================================================
47. ACCESSIBILITY UX
==================================================

All important actions must be keyboard accessible.

Touch targets:

minimum 44x44px.

Calendar cells:

must have accessible labels.

Example:

"Ngày 13 tháng 9, chi tiêu 350 nghìn đồng."

Do not rely only on heatmap color.

==================================================
48. OFFLINE / DATA UX
==================================================

Phase 1 may be local-first depending on final architecture.

The UI should not assume constant network availability.

If saving locally:

show immediate success.

Avoid unnecessary network loading indicators.

==================================================
49. WHAT NOT TO IMPLEMENT
==================================================

This Screen Spec must NOT introduce:

AI
AI chatbot
OCR
Voice input
Receipt scanning
Bank integration
Multiple accounts
Transfer
Investment
Debt
Credit card
Family account
Social
Gamification
Complex budgets
Financial health score
Net worth dashboard

These belong to future phases.

==================================================
50. PHASE 2 HOOKS
==================================================

Design should leave room for future:

AI insights
Receipt scanning
Voice input
Multiple accounts
Bank reconciliation
Account historical balance

But do NOT show these features in Phase 1 UI.

Do not add empty navigation items.

Do not add disabled "Coming Soon" screens unless explicitly requested.

==================================================
51. FINAL SCREEN INVENTORY
==================================================

The completed Screen Spec V1 must contain:

P0

01 Calendar Home
02 Daily Detail
03 Add Expense
04 Add Income
05 Edit Transaction

P1

06 Bills Home
07 Add Bill
08 Bill Detail
09 Statistics Home
10 Category Detail

P2

11 Profile
12 Starting Balance
13 Category Management
14 Theme Settings
15 Heatmap Settings

Global

16 Empty States
17 Loading States
18 Error States
19 Confirmation Modals
20 Toasts
21 Bottom Sheets

==================================================
52. FINAL DELIVERABLE
==================================================

Create:

/ux/screen-spec.md

Optionally split into:

/ux/
├── screen-spec.md
├── user-flows.md
├── navigation.md
├── interaction-rules.md
├── edge-cases.md
└── microcopy.md

The documentation must be detailed enough that a coding agent can implement the UI without asking:

"Where should this component go?"

"What happens when the user taps this?"

"What screen opens?"

"What is the primary action?"

"What happens after save?"

"What happens when there is no data?"

==================================================
53. FINAL QUALITY CHECK
==================================================

Before declaring UI/UX Screen Specification V1 complete, verify:

1. Can the Home screen be implemented without design decisions being invented?
2. Can the calendar interaction be implemented precisely?
3. Can a user add an expense in very few steps?
4. Can a user inspect one day?
5. Can a user inspect a category?
6. Can a user manage recurring bills?
7. Can a user understand their available balance immediately?
8. Can the entire app be navigated using only four bottom navigation items?
9. Are empty/loading/error states defined?
10. Are edge cases defined?
11. Does the UX remain calm and friendly?
12. Does the UI preserve the Monii-inspired calendar-first philosophy?
13. Does the specification avoid introducing account management?
14. Does the specification avoid AI?
15. Can a coding agent implement the screens without inventing its own UX?

If any answer is NO:

Refine the specification before declaring it complete.

==================================================
FINAL INSTRUCTION
==================================================

DO NOT WRITE APPLICATION CODE.

DO NOT WRITE DATABASE CODE.

DO NOT IMPLEMENT API.

DO NOT IMPLEMENT AUTHENTICATION.

DO NOT IMPLEMENT AI.

DO NOT IMPLEMENT ACCOUNTS.

DO NOT IMPLEMENT BANK FEATURES.

Your ONLY task is:

MOONEY UI/UX SCREEN SPECIFICATION V1.

The output must be production-ready documentation for a future AI coding agent.
```

### Thứ tự tài liệu của Mooney lúc này

Sau prompt này, project của bạn nên có cấu trúc kiểu:

```text
/project
│
├── product/
│   └── product-spec-v1.md
│
├── design/
│   ├── design-system.md
│   ├── tokens.md
│   ├── components.md
│   └── asset-guidelines.md
│
├── ux/
│   ├── screen-spec.md
│   ├── user-flows.md
│   ├── navigation.md
│   ├── interaction-rules.md
│   ├── edge-cases.md
│   └── microcopy.md
│
├── architecture/
│
├── database/
│
└── prompts/
```

**3 lớp đầu tiên đã có logic rất rõ:**

**Product Spec**
→ *Mooney phải có những tính năng gì?*

**Design System**
→ *Các UI component của Mooney phải trông như thế nào?*

**UI/UX Screen Spec**
→ *Từng màn hình được bố trí ra sao và user thao tác như thế nào?*

Sau đó mới nên làm **Architecture + Database Spec V1**. Với scope hiện tại, database cũng sẽ đơn giản hơn đáng kể vì chưa có `accounts`, `account_id`, `transfers` hay `balance_snapshots`. Điều này phù hợp với mục tiêu làm MVP nhanh trước khi mở rộng. Monii cũng không yêu cầu bank linking/account management để sử dụng các chức năng cốt lõi của nó. ([App Store][1])

[1]: https://apps.apple.com/vn/app/monii-money-calendar/id6803572087?utm_source=chatgpt.com "‎Monii - Money Calendar App - App Store"

