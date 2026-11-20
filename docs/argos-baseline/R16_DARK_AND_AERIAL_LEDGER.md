# R16 — Dark visual correction + owned aerial mode

**Branch:** `feature/view-r16-dark-aerial-r01`  
**Base:** `58895c0fa43a4c963f189b57b33af11596f4f02b` (production main after R15)

## Defects corrected

| Predicate | Correction |
|-----------|------------|
| `R15_DARK_MAP_VISUAL_FIDELITY_UNACCEPTABLE` | Cool-neutral flavor in `createArgosDarkFlavor()` — land `#20272D`, water `#102D40`, city labels `#E5EBEF` (not gold) |
| `R15_2D_PHOTOGRAPHIC_BASEMAP_MODE_ABSENT` | Dark \| Satellite HUD + owned NAIP raster PMTiles |

## Modes

- `dark-vector` — corrected Protomaps dark style
- `owned-aerial` — NAIP photographic + road/label overlay
- Outside aerial coverage → vector fallback + limited-coverage banner
- Cesium `3D` unchanged

## Default startup

Satellite preferred at LA camera `[-118.2437, 34.0522]`, zoom `10.5`. Persisted via `localStorage` key `caelrion.view.basemapMode`.

## Assets

- Vector (R15, preserved): `caelrion-basemap-r01-822f068466c7.pmtiles`
- Aerial (R16): see `R16_AERIAL_ARTIFACT.md`
