# Chicken Crash — Asset Manifest

| Asset | Prompt intent | Storage path |
|---|---|---|
| Art direction reference | Dark nocturnal crash-game flight path, indigo-black atmosphere, luminous electric-gold trajectory, amber particles, premium arcade/fintech mood. | `/manus-storage/chicken-dash-reference_60291c4b.png` |
| Pilot mascot | Determined golden chicken pilot with aviator helmet and brass goggles, clean cutout, warm amber palette. | `/manus-storage/chicken-dash-mascot_1b5e0100.png` |

Original generated files are kept outside the project at `/home/ubuntu/webdev-static-assets/` and are not committed into the deploy tree.

Note: the images are served through the Vite `/manus-storage` storage proxy, which requires the `BUILT_IN_FORGE_API_URL` / `BUILT_IN_FORGE_API_KEY` environment variables (available inside the Manus environment). Outside of it the proxy returns 500 and the images will not render.
