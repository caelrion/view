# V00 — Argos public UI reference matrix

**Coordinate:** `CAELRION_VIEW_CURSOR_ARGOS_BASELINE_V00_V02_R01`  
**Captured:** 2026-11-20 UTC  
**Reference site:** https://argosatlas.com/map/#flight=ae07f6  
**Attributions:** https://argosatlas.com/en/attributions/

## Source pin (preimage)

| Field | Value |
|-------|-------|
| Repo | `https://github.com/caelrion/view` |
| Branch (work) | `feature/view-argos-baseline-v00-v02-r01` |
| Baseline HEAD | `32c52db7be18e441d8743e446214b7e209269c0f` |
| Baseline tree | `1c822560351bc7f360ba9c3640024cc1f8711ec8` |
| Local↔origin/main (pre-edit) | MATCH (clean) |

## Observation vs inference

| Item | Class | Evidence |
|------|-------|----------|
| Dark map-first layout, top brand HUD, right filter rail, left detail panel | OBSERVED | Blog screenshots + live DOM structure (`#hud`, `#control-panel`, `#panel`, `#map`, `#footer`) |
| Cyan/teal accent on dark charcoal panels; thin borders; dense mono numerals | OBSERVED | Blog images + attributions fonts |
| CARTO Dark Matter + OpenFreeMap / OpenMapTiles / OSM ODbL | OBSERVED | Attributions page text |
| Montserrat / Open Sans / Noto Sans (SIL OFL) for map typefaces | OBSERVED | Attributions page text |
| Live map interaction at `#flight=ae07f6` without account | **UNKNOWN / BLOCKED** | Account/privacy splash (`argos-registro`); map canvas not mounted in automation browser |
| Exact pixel metrics at 1920/2560/390 from live map | **UNKNOWN** | Blog stills used as geometry proxies |
| Argos premium filter behaviors / proprietary icons | **NOT CLAIMED** | Not copied |

## Reference stills (evidence-only — not bundled into View app)

Path: evidence `v00/reference/`

| File | Bytes | SHA-256 | Role |
|------|------:|---------|------|
| `hero-flights-world.en.webp` | 130666 | `b3884ce8cde2f268b53b01cd823d64a53b391e28d629d518c4fcac45a7f65a3a` | World overview / header |
| `tema-vuelos-india.en.webp` | 118688 | `ee7fe4fef7b5bf939cad327a638eb0a078c0875c255bb8ef6293ef79f2dbc8dd` | Selected flight + cyan street map |
| `ctx-poland-airports-live-1-poland.en.webp` | 282116 | `e7558209e55e8dce6acf29a78034416380fb05a445cbcecb3e6308fb3c606eb9` | Right filter rail |
| `ctx-codigos-aeropuertos-espana-3-josep-tarradellas-barcel.en.webp` | 94318 | `477198e146b86ab771bc010f500a6ceb78fc6f53aa6cd5d9be466247e2d956aa` | Object detail panel |
| `lnd-flight.en.webp` | 210378 | `37af9b77835eb5feeba63eda73350f3404a92c1ddd6f41f8812bbab2bb4d2fb3` | Dense all-layer map |
| `attributions.html` | 102168 | `6bcab4947da79a1765715bfd209377191511574a206e90d38b57959a2f1d196e` | Rights inventory |

## Code owner map (first slice)

| Concern | Owner | Notes |
|---------|-------|-------|
| Cesium scene | `src/app/scene.js`, `src/maps/*` | Preserved |
| MapLibre presenter | `src/maps/maplibre2d/presenter.js` | Lifecycle only |
| Style/license constants | `src/maps/maplibre2d/style.js` | OpenFreeMap dark |
| Argos shell chrome | `src/ui/argosAtlas/shell.js` + `argos-atlas.css` | Caelrion brand |
| Mode switch | `src/ui/argosAtlas/mode.js` | Wired from `src/app/controls.js` |
| Aircraft display adapter | `src/presentation/aircraftDisplayRecord.js` | Pure; DEMO fixture |
| Incumbent flight feed | `src/layers/flights/*` | Not expanded for 2D path |

## Aircraft UI contract (V02)

- Input: validated display record (`id`, `lat`, `lon`, optional heading/label/telemetry, `provenance`, `status`).
- If no backend projection: **DEMO fixture** `ae07f6` with status `DEMO` and note `BACKEND_CONTRACT_PENDING`.
- Forbidden: browser ADS-B poll, LIVE claim for DEMO, new provider registry.

## Viewport capture plan

| Viewport | Argos live | Local implementation |
|----------|------------|----------------------|
| 1920×1080 | BLOCKED (auth splash) | Captured under `screenshots/` when preview available |
| 2560×1440 | BLOCKED | Deferred / scaled from 1920 where needed |
| 1440×900 | BLOCKED | Captured when preview available |
| 390×844 | BLOCKED | Captured when preview available |
