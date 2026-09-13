# Mooney - Agent Configuration

## Application Context
- **Name:** Mooney
- **Type:** Personal expense management web application
- **Core Inspiration:** Monii (calendar-first personal finance app)

## Current Phase
- **Phase 1:** Core UI/UX recreation + calendar-first experience
- **Status:** Initial development phase

## Important Scope Decisions
- **One Global Available Balance:** No accounts (no bank accounts, no cash, no wallets)
- **No Account Transfers:** All transactions affect the same balance pool
- **Accounts Deferred:** Will be implemented in Phase 2
- **Goal:** Reproduce 90% of Monii's core UI/UX before adding differentiated features

## Source of Truth
Before implementing anything, read and understand:
- `docs/product/product-spec.md` - Product direction and scope
- `docs/design/design-system.md` - Visual design system and tokens
- `docs/design/components.md` - Reusable UI components
- `docs/design/tokens.md` - Design tokens (colors, spacing, typography)
- `docs/ux/screen-spec.md` - Screen-by-screen UI/UX specifications
- `docs/ux/user-flows.md` - Key user flows and interactions
- `docs/ux/navigation.md` - Navigation structure and patterns

## Implementation Principles
- Follow the Design System exactly
- No feature creep (only what's in the docs)
- Keep logic simple and focused
- Prioritize mobile-first development
- Aim for production quality code
- Separate business logic from UI
- Use TypeScript for type safety
- Use Tailwind CSS for styling
- Use Next.js for the web application

## Design Style Guide
- **Vibe:** cute + calm + friendly + trustworthy
- **Typography:** Use design tokens for all text
- **Colors:** Use design tokens for all UI elements
- **Spacing:** Use design tokens for all layout spacing
- **Radius:** Use design tokens for all border radii
- **Components:** Use the Design System components only
