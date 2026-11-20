# Map / font / library license manifest (V1.1 / R08)

| Asset | Provider | License / terms | Used how |
|-------|----------|-----------------|----------|
| Dark basemap design (V1.1) | OpenMapTiles **Fiord** via OpenFreeMap | OpenMapTiles / OpenFreeMap provider terms | MapLibre style URL `styles/fiord` + bounded paint overrides |
| V1 predecessor (retained) | CARTO Dark Matter family via OpenFreeMap `dark` | CC BY 4.0 design heritage | `OPENFREEMAP_DARK_STYLE_URL` only — not active presenter default |
| Vector tiles | OpenFreeMap (`tiles.openfreemap.org`) | Provider terms; OpenMapTiles schema | Style `sources` |
| Map data | OpenStreetMap contributors | ODbL | Via OpenFreeMap tiles |
| Map glyphs | OpenFreeMap hosted | As provided for OpenMapTiles stacks | Style `glyphs` URL |
| UI fonts | Inter / Open Sans / Noto Sans / IBM Plex Mono | SIL OFL / respective licenses | CSS stacks (no Argos Michroma brand mark) |
| MapLibre GL JS | `maplibre-gl` `^5.24.1` | BSD-3-Clause | 2D presenter |
| CesiumJS | existing pin | Apache-2.0 | Unchanged 3D |

**Not used:** Argos proprietary source, Argos logo/marks, hotlinked Argos runtime tile endpoints, unlicensed screenshots as app assets, global CSS brightness filters as a map substitute.
