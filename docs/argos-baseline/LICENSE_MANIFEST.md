# Map / font / library license manifest (V1.2 / R11)

| Asset | Provider | License / terms | Used how |
|-------|----------|-----------------|----------|
| Satellite imagery (V1.2 primary) | Esri World Imagery (ArcGIS Online) | Esri Master Agreement; required attribution | MapLibre raster tiles `World_Imagery/MapServer/tile/{z}/{y}/{x}` — same keyless endpoint as Cesium `createEsriImagery()` |
| Label / road overlay | OpenMapTiles schema via OpenFreeMap planet | OpenMapTiles / OpenFreeMap provider terms; OSM ODbL | Vector source `tiles.openfreemap.org/planet` + road/place layers |
| Satellite-unavailable fallback | OpenMapTiles **Fiord** via OpenFreeMap | OpenMapTiles / OpenFreeMap provider terms | `OPENFREEMAP_FIORD_STYLE_URL` when imagery fails |
| V1 predecessor (retained) | CARTO Dark Matter family via OpenFreeMap `dark` | CC BY 4.0 design heritage | `OPENFREEMAP_DARK_STYLE_URL` only — not active presenter default |
| Map data | OpenStreetMap contributors | ODbL | Via OpenFreeMap vector tiles |
| Map glyphs | OpenFreeMap hosted | As provided for OpenMapTiles stacks | Style `glyphs` URL |
| UI fonts | Inter / Montserrat / Open Sans / Noto Sans / IBM Plex Mono | SIL OFL / respective licenses | CSS stacks (no Argos Michroma brand mark) |
| MapLibre GL JS | `maplibre-gl` `^5.24.1` | BSD-3-Clause | 2D presenter |
| CesiumJS | existing pin | Apache-2.0 | Unchanged 3D |

**Not used:** Argos proprietary source, Argos logo/marks, hotlinked Argos runtime tile endpoints, unlicensed screenshots as app assets, global CSS brightness filters as a map substitute, MapTiler Hybrid (API key not configured), ArcGIS Location Platform basemaps-api style (token required).
