# Map / font / library license manifest (R15 owned vector)

| Asset | Provider | License / terms | Used how |
|-------|----------|-----------------|----------|
| Default 2D basemap | Caelrion-hosted Protomaps v4 extract | OSM ODbL for data; Protomaps tooling BSD | Same-origin PMTiles `/assets/maps/caelrion-basemap-r01-*.pmtiles` |
| Style layers | `@protomaps/basemaps` | BSD | `layers()` + Argos-tuned `namedFlavor('dark')` |
| Glyphs / sprites | `protomaps/basemaps-assets` | SIL OFL (fonts) | Self-hosted `/assets/basemaps/fonts` · `/assets/basemaps/sprites/v4/dark` |
| Optional recovery | OpenMapTiles **Fiord** via OpenFreeMap | OpenMapTiles / OpenFreeMap terms | Only if owned archive style fails |
| Offline stub | Caelrion | — | Slate background when no style loads |
| MapLibre GL JS | `maplibre-gl` | BSD-3-Clause | 2D presenter |
| PMTiles runtime | `pmtiles` | BSD | `pmtiles://` protocol |
| CesiumJS | existing pin | Apache-2.0 | Optional 3D (external providers unchanged) |

**Not used as default 2D:** Esri World Imagery (keyless or Location Platform), MapTiler Hybrid, Argos proprietary tiles, ArcGIS basemaps-api without entitlement.

**R12 Esri entitlement blocker:** Superseded for the **default 2D** path by this owned-vector basemap. Cesium 3D may still reference external imagery stacks independently.
