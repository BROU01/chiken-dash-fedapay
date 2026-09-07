# Chicken Crash — Structure

- `client/src/App.tsx` — application shell and route.
- `client/src/pages/Home.tsx` — primary game screen and interaction composition.
- `client/src/game/crashEngine.ts` — framework-agnostic round engine for multiplier progression and crash outcomes.
- `client/src/index.css` — global tokens, typography, game-specific effects, responsive layout helpers, and reduced-motion behavior.
- `/manus-storage/chicken-dash-reference_60291c4b.png` — generated art-direction background/texture.
- `/manus-storage/chicken-dash-mascot_1b5e0100.png` — generated pilot mascot.

The UI owns display state and calls the plain TypeScript engine for round transitions. The game board is drawn as inline SVG so it stays sharp and light, while the generated assets provide the hero-level art direction and brand personality.
