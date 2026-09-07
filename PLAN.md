# Chicken Crash — Build Plan

## Product slice

Create a polished single-screen crash-game prototype based on the attached assessment. The prototype is demo-only and deliberately does not process real money. It should communicate the full loop: configure a stake, place a bet, watch the multiplier climb, cash out before the crash, and review round history.

## Risk slices

1. **Live multiplier loop** — deterministic client-side animation with a crash state, cash-out state, and a resettable next round.
2. **Responsive game board** — chart, status badge, pilot mascot, wallet controls, and action controls remain legible at desktop and mobile widths.
3. **Interaction feedback** — bet placement, cash-out, wallet mode switch, quick amounts, provably-fair copy, and toast-like status messaging.
4. **Visual polish** — generated art direction asset, generated mascot, dark premium palette, chart glow, glass panels, and reduced-motion support.

## Verification criteria

- `pnpm check` passes.
- `pnpm build` passes.
- Preview renders at `/` without runtime errors.
- Desktop screenshot visibly shows multiplier, live curve, wager controls, cash-out CTA, wallet balance, recent rounds, and live feed.
- Mobile screenshot remains usable at 390px width with controls stacked and no horizontal overflow.
- `?demo` starts a deterministic-looking active round for screenshot verification.

## Explicit product boundaries

- Real-money wallet is represented as a non-functional mode label with a safe demo-only notice.
- No backend, authentication, deposits, withdrawals, or financial transaction flow is implemented.
- The “provably fair” panel explains the intended hash/seed verification concept without claiming a server-backed proof in this frontend-only prototype.

## Art direction

Deep indigo/black environment, electric gold flight path, coral crash state, warm cream text, condensed display typography, and generated chicken pilot artwork.
