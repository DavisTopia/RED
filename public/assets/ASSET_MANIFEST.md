# R.E.D. Asset Manifest

No external or authored content assets are currently registered. The game's existing visuals are generated at runtime by Three.js. Add an entry here **before** committing or shipping an asset; do not infer permissions from a file being publicly downloadable.

| Asset name | Source | Original author | License | Original download URL | File location |
| --- | --- | --- | --- | --- | --- |
| _No assets registered_ | — | — | — | — | — |

For each new entry, record the source and creator as credited by the original publisher, the exact license/version and any attribution requirements, the original download page URL, and the path relative to `public/`. If any detail cannot be verified, do not include the asset in a release.

## Directory guide

- `characters/` — character models; `characters/races/` — race-specific variants
- `creatures/`, `weapons/`, `armor/` — gameplay model categories
- `environment/`, `terrain/`, `vegetation/` — world models and source textures
- `textures/`, `materials/` — reusable texture sets and material definitions
- `animations/`, `audio/`, `ui/` — animation, sound, and interface assets

Prefer GLB for self-contained glTF models; glTF with external resources is also supported by Three.js's GLTFLoader. Keep related texture sets together and register each asset's location in the manifest. The model loader resolves paths relative to the deployed page so assets work on GitHub Pages project paths.
