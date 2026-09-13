# PROMPT — MOONEY DESIGN SYSTEM V1

```text
You are the Lead Product Designer and Design Systems Engineer for a personal finance web app called MOONEY.

Your task is NOT to build the application yet.

Your task is to define and document the complete DESIGN SYSTEM V1 for Mooney so that a coding agent can later implement the UI consistently without inventing its own visual language.

==================================================
1. PRODUCT CONTEXT
==================================================

Product name:

MOONEY

Mooney is a mobile-first personal finance web app inspired heavily by Monii - Money Calendar.

The Phase 1 product goal is:

"Make Mooney feel approximately 90% like Monii in terms of visual language, interaction patterns, information hierarchy and overall UX philosophy, while using Mooney branding and implementation."

The provided Monii screenshot is the PRIMARY visual reference.

Do not treat this as a generic finance dashboard.

Do not redesign the product into a modern SaaS dashboard.

Do not use generic banking UI patterns unless explicitly required.

The intended emotional qualities are:

- Cute
- Calm
- Friendly
- Trustworthy
- Simple
- Warm
- Lightweight
- Personal

The app should feel like:

"my friendly personal money calendar"

rather than:

"corporate financial management software"

==================================================
2. CURRENT PRODUCT SCOPE
==================================================

Phase 1 uses ONE global available balance.

There is NO account-management system yet.

Do NOT design:

- Bank accounts
- Cash accounts
- Wallet accounts
- Account switching
- Account balance per bank
- Transfers
- Bank reconciliation
- Historical balance per account

The main money concept is:

AVAILABLE BALANCE

Example:

KHẢ DỤNG

6.390.000 đ

Transactions are:

- Expense
- Income

The main product navigation is:

Lịch
Hóa đơn
Thống kê
Cá nhân

==================================================
3. PRIMARY VISUAL REFERENCE
==================================================

Use the supplied Monii screenshot as the strongest visual reference.

The reference contains:

- Warm off-white background
- Dark botanical green
- Sage / pale green
- Large rounded balance card
- Monthly calendar
- Spending heatmap
- Rounded white cards
- Soft shadows
- Friendly typography
- Small icons
- Cute illustration / mascot
- Rounded bottom navigation
- Floating action buttons
- Orange and red warning states
- Blue income state
- Generous whitespace

The final Mooney design should preserve this visual grammar.

However:

DO NOT copy Monii's branding, logo, mascot, exact illustrations or proprietary assets.

Create a distinct Mooney identity using the same design philosophy.

==================================================
4. DESIGN PRINCIPLES
==================================================

All UI decisions must follow these principles.

PRINCIPLE 1 — CALM FIRST

Financial information can create anxiety.

The interface should feel calm rather than alarming.

Use warning colors sparingly.

Do not make every negative financial number bright red.

--------------------------------------------------

PRINCIPLE 2 — VISUAL BEFORE TEXT

Users should understand their financial state from:

- color
- size
- hierarchy
- calendar position
- spacing
- icons

before reading large amounts of explanatory text.

--------------------------------------------------

PRINCIPLE 3 — ONE PRIMARY ACTION

Each screen should have one obvious primary action.

Example:

Calendar:
→ Add expense

Bill:
→ Add bill

Statistics:
→ Explore category

Settings:
→ Change setting

Do not create multiple competing primary buttons.

--------------------------------------------------

PRINCIPLE 4 — SOFT UI

Prefer:

- rounded corners
- soft shadows
- subtle borders
- large touch targets
- comfortable spacing

Avoid:

- sharp rectangular cards
- heavy borders
- dense tables
- tiny controls
- excessive separators

--------------------------------------------------

PRINCIPLE 5 — MOBILE FIRST

Primary target:

iPhone-sized viewport.

Desktop is secondary.

Do not stretch the UI into a huge desktop dashboard.

On desktop, center the application within a comfortable maximum width.

==================================================
5. DESIGN TOKEN SYSTEM
==================================================

Create a complete token system.

Do NOT hard-code random colors throughout components.

All visual properties should come from semantic tokens.

Create:

/design/tokens.md

and, when implementation begins later:

/styles/tokens.css

or the equivalent Tailwind theme configuration.

==================================================
6. COLOR SYSTEM
==================================================

Define semantic colors rather than component-specific colors.

Required categories:

BACKGROUND
SURFACE
SURFACE_SECONDARY
SURFACE_ELEVATED

TEXT_PRIMARY
TEXT_SECONDARY
TEXT_MUTED
TEXT_DISABLED

PRIMARY
PRIMARY_HOVER
PRIMARY_PRESSED
PRIMARY_SOFT

SUCCESS
SUCCESS_SOFT

WARNING
WARNING_SOFT

DANGER
DANGER_SOFT

INFO
INFO_SOFT

BORDER
DIVIDER

INCOME
EXPENSE

HEAT_LOW
HEAT_MEDIUM
HEAT_HIGH

The main Mooney identity should revolve around a dark botanical green.

Suggested initial palette direction:

Primary:
deep forest / botanical green

Background:
warm ivory / warm off-white

Surface:
soft white

Secondary surface:
very pale green / warm neutral

Success:
green

Warning:
warm orange

Danger:
soft red

Income:
calm blue

Do NOT make the colors excessively saturated.

The application should feel soft.

IMPORTANT:

The exact HEX values should be selected systematically and documented.

Do not randomly choose colors per component.

==================================================
7. COLOR SEMANTICS
==================================================

Define clear rules.

Example:

PRIMARY GREEN
→ main actions
→ active navigation
→ selected states
→ important positive UI

INCOME BLUE
→ income indicators
→ income transaction amount
→ positive cash inflow

HEAT LOW
→ light spending day

HEAT MEDIUM
→ moderate spending day

HEAT HIGH
→ heavy spending day

WARNING ORANGE
→ upcoming bill
→ caution
→ approaching spending limit

DANGER RED
→ destructive actions
→ severe overspending
→ validation errors

Do not use red simply because an expense is an expense.

Expenses should normally remain neutral/dark text unless the spending state itself is problematic.

==================================================
8. TYPOGRAPHY
==================================================

Define the complete typography scale.

At minimum:

Display
Heading XL
Heading L
Heading M
Heading S

Body L
Body M
Body S

Caption
Overline

Define:

- font family
- font size
- font weight
- line height
- letter spacing

The typography should feel:

- friendly
- modern
- readable
- slightly rounded if an appropriate font is available

Avoid overly futuristic fonts.

Avoid corporate banking typography.

The amount:

6.390.000 đ

should have strong visual hierarchy.

But it must not visually dominate the entire screen.

==================================================
9. NUMBER / MONEY TYPOGRAPHY
==================================================

Money values are extremely important.

Define specific rules for:

Large balance:

6.390.000 đ

Daily expense:

350.000 đ

Small calendar value:

150k

Percentage:

35%

Rules:

- Use tabular or numerically stable figures when appropriate.
- Preserve readability.
- Avoid excessive decimal places for VND.
- Use Vietnamese number formatting.
- Keep currency symbols consistent.

Examples:

6.390.000 đ

150.000 đ

1,2 triệu đ

Do not randomly switch between:

6.390.000đ
6,390,000 VND
₫6.390.000

The design system must define one default representation.

==================================================
10. SPACING SYSTEM
==================================================

Use a consistent spacing scale.

Define tokens such as:

4
8
12
16
20
24
32
40
48
64

Use spacing tokens everywhere.

Do not create arbitrary values such as:

13px
17px
23px
29px

unless there is a documented reason.

Primary mobile screen spacing should feel generous.

Recommended conceptual structure:

Screen padding:
16–20px

Card internal padding:
16–20px

Section spacing:
24–32px

Major section spacing:
32–40px

==================================================
11. BORDER RADIUS
==================================================

The UI is rounded.

Define:

radius-sm
radius-md
radius-lg
radius-xl
radius-2xl
radius-full

Suggested direction:

Small controls:
10–12px

Inputs:
12–16px

Cards:
18–24px

Large hero card:
24–28px

Pills:
9999px

Avoid excessive rounding where everything becomes a pill.

==================================================
12. SHADOW SYSTEM
==================================================

Use soft shadows.

Define:

shadow-none
shadow-sm
shadow-card
shadow-floating
shadow-modal

The UI should not look like material design with heavy elevation.

Cards should appear slightly lifted from the warm background.

Use shadows subtly.

==================================================
13. ICON SYSTEM
==================================================

Use one consistent icon family.

Preferred:

Lucide Icons

or another consistent outline icon system.

Do not mix:

- Font Awesome
- Material Icons
- random SVGs
- emoji

unless explicitly intentional.

Icon rules:

Small icon:
16px

Standard:
20px

Large:
24px

Navigation:
22–24px

Primary floating action:
24px

Icons should generally use:

stroke-based
rounded
friendly
minimal

Avoid aggressive sharp icons.

==================================================
14. APP SHELL
==================================================

Define the overall application container.

Mobile:

100% width

Desktop:

centered application shell

Recommended maximum width:

approximately 430–480px for the primary mobile experience.

Desktop background can expose the warm neutral background around the app.

The main app itself should remain visually similar to an iPhone application.

==================================================
15. TOP HEADER
==================================================

Home header:

Left:

Mooney branding

Right:

Moon / theme toggle

Structure:

MOONEY
Money Calendar

                    ☾

The logo area must be visually compact.

Do not make the logo huge.

Define:

logo size
subtitle size
header height
horizontal padding
vertical spacing

==================================================
16. MONTH SELECTOR
==================================================

Create a reusable MonthSelector component.

Example:

‹      Thg 9, 2026      ›

Rules:

- month centered
- arrows easy to tap
- current month clearly readable
- controls must have minimum 44x44px touch target
- no tiny arrow buttons

Visual hierarchy:

month label > navigation arrows

==================================================
17. AVAILABLE BALANCE CARD
==================================================

This is one of the most important components.

Component:

AvailableBalanceCard

Structure:

KHẢ DỤNG

6.390.000 đ

Tốc độ chi tiêu tốt!
Bạn đã chi 25% thu nhập tháng này.

Mascot / illustration

Optional edit action.

Visual hierarchy:

1. label
2. balance
3. insight
4. illustration

The card should be large and visually distinctive.

Use the main Mooney green.

Do not overcrowd it.

Do not place too many metrics inside the card.

==================================================
18. MASCOT / ILLUSTRATION SYSTEM
==================================================

Mooney needs a consistent illustration language.

Do not copy Monii's mascot.

Define a Mooney mascot concept that can support multiple states.

Required states:

DEFAULT
HAPPY
GOOD_SPENDING
WARNING
HIGH_SPENDING
EMPTY
SUCCESS

The mascot should:

- have simple shapes
- have friendly expressions
- use the Mooney palette
- work at small sizes
- work on cards
- work on empty states

Create:

/design/asset-guidelines.md

Document:

- mascot usage
- illustration size
- safe area
- placement
- background
- do not distort
- do not recolor arbitrarily
- do not mix illustration styles

==================================================
19. CALENDAR DESIGN
==================================================

The calendar is the CORE Mooney component.

Component:

FinancialCalendar

Structure:

Weekday header

T2 T3 T4 T5 T6 T7 CN

Calendar cells.

Each cell may contain:

Date
Daily spending
Heat indicator

Example:

13
350k

The cell must remain readable at iPhone width.

Do not make the calendar overly dense.

==================================================
20. CALENDAR CELL STATES
==================================================

Define all states.

NORMAL

No spending.

LOW_SPENDING

Small expense.

MEDIUM_SPENDING

Moderate expense.

HIGH_SPENDING

Large expense.

INCOME

Income occurred.

TODAY

Current date.

SELECTED

User selected date.

TODAY + SELECTED

Disabled / outside current month

Example conceptual state:

┌───────────┐
│    13     │
│   350k    │
│     ●     │
└───────────┘

Selected:

Use a subtle green outline or soft green background.

Do not use heavy borders.

==================================================
21. HEATMAP
==================================================

Phase 1:

LOW
< 100.000

MEDIUM
100.000–500.000

HIGH
> 500.000

These thresholds should be configurable in the future.

Heatmap should visually communicate spending intensity.

IMPORTANT:

Heat colors must remain readable with black/dark text.

Do not make HIGH spending cells visually aggressive.

==================================================
22. CALENDAR LEGEND
==================================================

At the bottom:

Mức chi tiêu:

<100k
100k–500k
>500k

Use small colored indicators.

Keep it subtle.

The legend should never compete with the calendar itself.

==================================================
23. DAILY DETAIL
==================================================

When the user taps a date:

Open a bottom sheet or dedicated detail view.

Preferred interaction:

BOTTOM SHEET

because it preserves calendar context.

Structure:

Ngày 13/09

Tổng chi
350.000 đ

Thu nhập
0 đ

Transactions

[transaction cards]

The bottom sheet should have:

- rounded top corners
- drag handle
- comfortable padding
- clear close gesture
- maximum height
- internal scrolling

==================================================
24. TRANSACTION CARD
==================================================

Each transaction should show:

Icon
Category
Note / merchant
Time or date
Amount

Example:

🍜  Ăn uống
    Ăn trưa

          -150.000 đ

Income:

Lương

          +10.000.000 đ

Expense amounts:

Use neutral/dark text by default.

Income:

Use income blue or positive green according to the final color system.

==================================================
25. ADD TRANSACTION UI
==================================================

Use a bottom sheet or modal.

The interaction should be quick.

Expense form:

Amount
Category
Date
Note

Income form:

Amount
Category
Date
Note

The amount field should be the visual focus.

Example:

150.000 đ

The primary CTA:

Lưu

should be obvious.

Avoid long forms.

==================================================
26. INPUT DESIGN
==================================================

Inputs must feel soft and friendly.

Define:

Default
Focused
Filled
Error
Disabled

Input:

rounded
light border
soft background

Focus:

Mooney green

Error:

soft red border/background

Avoid heavy black outlines.

==================================================
27. BUTTON SYSTEM
==================================================

Define:

Primary Button
Secondary Button
Tertiary Button
Danger Button
Icon Button
Floating Action Button
Pill Button

Primary:

Mooney green background
white text

Secondary:

soft green / neutral background

Danger:

soft red or red

Icon Button:

transparent / subtle surface

All interactive elements should have minimum touch target:

44 x 44px

==================================================
28. FLOATING ACTION BUTTONS
==================================================

Reference UI has floating camera and microphone buttons.

Keep their visual positions.

Phase 1 functionality may be disabled / placeholder.

Define:

FAB size
icon size
shadow
spacing
stack direction
safe area

They should not overlap bottom navigation.

==================================================
29. BOTTOM NAVIGATION
==================================================

This is a core component.

Four tabs:

Lịch
Hóa đơn
Thống kê
Cá nhân

Use:

icon
label

Active tab:

soft Mooney green background
dark green icon
dark green label

Inactive:

muted neutral

The navigation should sit inside a rounded container.

It should visually feel like the reference screenshot.

Do not use a traditional full-width Android-style bottom navigation bar.

==================================================
30. UPCOMING BILL CARD
==================================================

Bills should use cards.

Example:

Netflix

159.000 đ

3 ngày nữa

Use:

neutral surface
small icon
clear due-date hierarchy

Warning states:

Today
Tomorrow
Overdue

Use warning colors carefully.

==================================================
31. STATISTICS DESIGN
==================================================

Statistics must not look like an analytics dashboard.

It should remain personal and friendly.

Hierarchy:

Monthly spending
↓
Category chart
↓
Category list
↓
Monthly recap

Charts:

rounded
minimal
no unnecessary grid lines
no excessive labels

Use the Mooney color palette.

==================================================
32. PIE CHART
==================================================

Pie chart:

- simple
- readable
- rounded aesthetic
- category colors consistent
- legend underneath or beside depending on width

Do not use rainbow colors.

Category colors must come from a controlled palette.

==================================================
33. CATEGORY DRILL-DOWN
==================================================

When user taps a category:

Open CategoryDetail.

Example:

ĂN UỐNG

3.010.000 đ

Then:

13/09
Ăn trưa
150.000 đ

12/09
Cafe
60.000 đ

The category detail screen should feel like a continuation of Statistics.

Do not make it look like a completely separate application.

==================================================
34. MONTHLY RECAP
==================================================

Create reusable recap cards.

Metrics:

Savings Rate
Top Spending Day
Cash Kept
Total Income
Total Expense

Use small visual cards.

Avoid large dashboard grids.

On mobile:

prefer vertical stacking or compact 2-column cards.

==================================================
35. SAFE DAILY SPENDING COMPONENT
==================================================

Create:

SafeDailySpendingCard

Example:

Bạn có thể chi khoảng

375.882 đ/ngày

mà vẫn giữ được kế hoạch tháng này.

Use calm visual treatment.

Do not make it feel like a strict budget warning.

==================================================
36. EMPTY STATES
==================================================

Create a complete empty-state system.

Required:

No transactions
No bills
No statistics
No search results
No category transactions

Structure:

Illustration
Title
Short explanation
Optional CTA

Example:

Không có hóa đơn sắp đến hạn

Bạn chưa có hóa đơn nào trong tháng này.

Use mascot/illustration where appropriate.

==================================================
37. LOADING STATES
==================================================

Use subtle skeleton loading.

Do not use giant spinners.

Skeletons should mimic:

- balance card
- calendar
- bill cards
- statistics cards

==================================================
38. ERROR STATES
==================================================

Errors should be calm and actionable.

Example:

Không thể tải dữ liệu.

Thử lại

Avoid technical error messages in the primary UI.

==================================================
39. TOAST / FEEDBACK
==================================================

Create:

Success Toast
Error Toast
Info Toast
Warning Toast

Example:

Đã thêm khoản chi.

Đã cập nhật giao dịch.

Do not keep toast visible for too long.

Use subtle animation.

==================================================
40. MODAL / BOTTOM SHEET SYSTEM
==================================================

Define:

Small Bottom Sheet
Large Bottom Sheet
Confirmation Modal
Alert Modal

Preferred interaction on mobile:

Bottom sheet

Use modal only when confirmation or destructive action is required.

==================================================
41. DARK MODE
==================================================

Dark mode must not simply invert colors.

Create separate semantic dark tokens.

Dark mode should preserve:

- green identity
- contrast
- soft surfaces
- hierarchy
- warmth

Avoid pure:

#000000

for the main background.

Use deep warm green/neutral surfaces instead.

==================================================
42. RESPONSIVE RULES
==================================================

Primary:

320–430px mobile.

Secondary:

431–768px tablet/small desktop.

Desktop:

769px+

Mobile:

full-width app

Desktop:

centered app shell

Calendar must remain usable at all widths.

Do not increase the number of columns beyond the 7-day calendar.

==================================================
43. ANIMATION SYSTEM
==================================================

Animations should be subtle.

Define:

fast
normal
slow

Examples:

Tap:
scale / opacity

Bottom sheet:
slide up

Modal:
fade + slight scale

Navigation:
subtle fade

Calendar:
soft transition

Avoid:

- excessive bouncing
- flashy animations
- long transitions
- gamified effects

Recommended feeling:

"quietly polished"

==================================================
44. ACCESSIBILITY
==================================================

Design system must define:

- minimum touch target 44px
- readable text contrast
- focus states
- keyboard navigation
- screen-reader labels
- color should never be the only information signal

Especially important:

Calendar heatmap must not rely exclusively on color.

Use amount / indicator as secondary information.

==================================================
45. COMPONENT INVENTORY
==================================================

Create a complete component inventory.

At minimum:

AppShell
TopHeader
MonthSelector
AvailableBalanceCard
SafeDailySpendingCard
FinancialCalendar
CalendarCell
CalendarLegend
DailyDetailSheet
TransactionCard
TransactionForm
AmountInput
CategorySelector
DateSelector
PrimaryButton
SecondaryButton
IconButton
FloatingActionButton
BottomNavigation
BillCard
BillList
StatisticsHeader
PieChart
CategoryList
CategoryDetail
MonthlyRecap
SettingsSection
SettingRow
EmptyState
Skeleton
Toast
BottomSheet
Modal
Mascot

==================================================
46. COMPONENT STATES
==================================================

Every interactive component must define:

Default
Hover
Pressed
Focus
Disabled
Loading
Error
Selected

Where applicable.

Do not leave component states undefined.

==================================================
47. UX CONSISTENCY RULES
==================================================

Create explicit rules.

Examples:

RULE 1
Never use more than one primary CTA in a view.

RULE 2
Never use arbitrary colors outside the design token system.

RULE 3
Never introduce a new border radius without adding a token.

RULE 4
Never use a different icon family.

RULE 5
Never create a new card style if an existing card component can be reused.

RULE 6
Expense is not automatically red.

RULE 7
Warning colors are reserved for actual warning states.

RULE 8
All touch targets must be at least 44px.

RULE 9
Bottom sheets are preferred over desktop-style modals on mobile.

RULE 10
Financial numbers must have consistent formatting.

RULE 11
Do not turn mobile screens into dense dashboards.

RULE 12
Whitespace is a feature.

==================================================
48. DESIGN ANTI-PATTERNS
==================================================

Explicitly prohibit:

- Generic SaaS dashboard
- Excessive cards
- Excessive shadows
- Excessive gradients
- Neon colors
- Glassmorphism
- Huge headings
- Tiny text
- Dense tables
- Heavy borders
- Excessive red
- Rainbow charts
- Random icons
- Random emojis
- Multiple font families
- Inconsistent corner radius
- Inconsistent spacing
- Desktop-first layout
- Excessive animations

==================================================
49. DESIGN FILE STRUCTURE
==================================================

Create documentation with this structure:

/design
├── design-system.md
├── tokens.md
├── typography.md
├── colors.md
├── spacing.md
├── components.md
├── calendar.md
├── navigation.md
├── forms.md
├── charts.md
├── states.md
├── animations.md
├── accessibility.md
└── asset-guidelines.md

If some documents would be unnecessarily repetitive, consolidate them logically.

The documentation should be written so that an AI coding agent can read it and implement the UI without asking basic design questions.

==================================================
50. DESIGN SYSTEM DOCUMENT FORMAT
==================================================

Every component specification should use this structure:

COMPONENT NAME

Purpose

Visual hierarchy

Anatomy

Dimensions

Spacing

Typography

Colors

Border radius

Shadow

States

Interactions

Responsive behavior

Accessibility

Do / Don't

Example usage

==================================================
51. DESIGN TOKEN FORMAT
==================================================

Use a semantic token naming system.

Example:

color.background.primary
color.surface.default
color.surface.elevated

color.text.primary
color.text.secondary
color.text.muted

color.brand.primary
color.brand.primarySoft

color.status.success
color.status.warning
color.status.danger

color.heat.low
color.heat.medium
color.heat.high

spacing.1
spacing.2
spacing.3

radius.sm
radius.md
radius.lg

shadow.card
shadow.floating

motion.fast
motion.normal
motion.slow

Do not use component names inside primitive tokens.

==================================================
52. DESIGN IMPLEMENTATION RULE
==================================================

When actual development begins:

The coding agent MUST read:

/design/design-system.md
/design/tokens.md
/design/components.md
/design/calendar.md

before implementing UI.

If a requested UI does not have a defined pattern:

DO NOT invent a random solution.

Instead:

1. Reuse an existing pattern.
2. Extend an existing component.
3. Add the new pattern to the Design System.

==================================================
53. FIDELITY TARGET
==================================================

The visual target is:

~90% Monii-inspired

while:

100% Mooney implementation.

Preserve:

- information hierarchy
- layout philosophy
- visual density
- calendar-first experience
- rounded card language
- green visual identity
- heatmap concept
- floating actions
- bottom navigation
- calm financial tone

Differentiate:

- Mooney branding
- logo
- mascot
- illustrations
- exact color values
- icons/assets
- future product features

==================================================
54. DELIVERABLE
==================================================

Do NOT write application code yet.

First produce the Design System V1 documentation.

The final output must include:

1. Design philosophy
2. Complete color system
3. Typography system
4. Spacing system
5. Radius system
6. Shadow system
7. Icon system
8. Responsive system
9. Motion system
10. Component inventory
11. Component specifications
12. Calendar design specification
13. Navigation specification
14. Form specification
15. Statistics/chart specification
16. Empty/loading/error states
17. Dark mode
18. Accessibility
19. Mascot/asset guidelines
20. Do/Don't rules
21. AI coding-agent implementation rules

==================================================
55. FINAL QUALITY CHECK
==================================================

Before finishing, review the Design System against these questions:

1. Can an AI coding agent implement the Home screen without inventing colors?
2. Can it implement the calendar without inventing spacing?
3. Can it implement a transaction form without inventing button styles?
4. Can it implement Statistics without inventing chart colors?
5. Can it implement Dark Mode consistently?
6. Can it implement a new screen while preserving the same visual language?
7. Does the design still feel like Mooney rather than a generic fintech dashboard?
8. Does the design preserve the visual philosophy of the provided Monii screenshot?
9. Is every major visual decision represented by a reusable token or component?
10. Are there unnecessary design decisions that should be postponed?

If the answer to any question is NO,
refine the Design System before declaring it complete.

IMPORTANT:

Do not start implementing the application.

Do not create database logic.

Do not create API routes.

Do not implement authentication.

Do not implement AI.

Do not implement accounts.

This task is ONLY:

MOONEY DESIGN SYSTEM V1.
```

### Một điểm tôi muốn giữ nguyên

Ở Design System này, **đừng cố “thiết kế đẹp hơn Monii” ngay**. Mục tiêu của Phase 1 là fidelity. Monii thực sự lấy **calendar + heatmap + safe-to-spend + recurring bills + statistics** làm trung tâm, nên hệ thống thiết kế của Mooney cũng phải xoay quanh các component đó thay vì biến thành một dashboard tài chính nhiều biểu đồ. ([App Store][1])

Sau khi agent hoàn thành prompt này, thứ tự hợp lý sẽ là:

**Product Spec V1 → Design System V1 → UI/UX Screen Spec V1 → Architecture/Database → Coding Rules → bắt đầu code.**

Đặc biệt, **đừng cho agent code ngay sau Design System**. Bước kế tiếp tôi khuyên làm là **UI/UX Screen Specification V1**: mô tả *từng màn hình một*, từ Home → Calendar → Daily Detail → Add Expense → Bills → Statistics → Category Detail → Profile, kèm layout và interaction chính. Khi có cả Design System + Screen Spec thì AI agent code sẽ ít tự ý thay đổi UI hơn rất nhiều.

[1]: https://apps.apple.com/vn/app/monii-money-calendar/id6803572087?utm_source=chatgpt.com "‎Monii - Money Calendar App - App Store"

