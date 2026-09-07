# Chicken Crash — Memory

- WebDev project initialized as `chiken_dash` with a web-static React/Vite scaffold.
- Generated and uploaded a reference background and chicken pilot mascot.
- The prototype intentionally avoids backend and real-money operations; all state is local and demo-only.
- If the UI is resumed, verify the storage URLs in `ASSETS.md` and keep the generated art visible in the game board.
- `?demo` is supported by the screen component to begin a game round automatically for screenshots.

## Visual verification

The desktop preview presents the generated flight-path art, live multiplier, pilot marker, stake controls, and wallet in a coherent first viewport. The mobile preview stacks the wallet, chart, and controls without horizontal overflow; the multiplier readout was lifted on compact screens to avoid overlap with the animated pilot marker. Final validation should rerun `pnpm check` and `pnpm build` after any future UI edits.

## Automatic cash-out verification

The new control is available before takeoff, with a target multiplier constrained to 1.01x–50.00x. The switch and target field are disabled once a flight is live. End-to-end browser verification with a 1.01x target confirmed the bet landed automatically at 1.03x, returned `$25.75` to the demo wallet, updated the round history, and changed the status to `LANDED SAFE`. Desktop and full-page mobile screenshots show the control fits cleanly in both layouts.
