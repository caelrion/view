# R19 — Clean globe and 2D detail continuity

**Coordinate:** `CAELRION_VIEW_R19_CLEAN_GLOBE_AND_2D_DETAIL_CONTINUITY_R01`  
**Owner:** Incumbent View frontend/Cursor custodian  
**Coordination:** OWEN / OOS / BSB  
**Base:** `f4190ee4e9ee8c540817f6f2c06533e0b93ac281` (R18 production main) · tree `2147b91061284540fa4d02bf1a03fece92557aee`

## Slices

| Slice | Predicate                              | State                                                                                                                               |
| ----- | -------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| R19-0 | `NO_CESIUM_LOGO_VISIBLE` (ion-free)    | Source ready — hide `.cesium-credit-logoContainer` only when `photoreal.route !== 'google-ion'`                                     |
| R19-1 | Sharper Satellite via verified LA NAIP | Source ready — NAIP sha256 `cc7ee43c…` · 65,411,958 B · HTTP 206 on prod asset path · fade-in over EOx/GIBS inside `NAIP_LA_BOUNDS` |
| R19-2 | Progressive road/label fade            | Source ready — `zoomDetail.js` opacity bands z≈4–7 / 8–10 / 10–12 / 12+                                                             |
| R19-3 | Camera continuity + Layers satellites  | Source ready — handoff view 2D↔3D; trackedEntity ownership respected; CelesTrak/SGP4 via shared Layers + DataLayerManager bridge    |

## Non-goals

No new engine/backend/tile server/credentials/billing. No wholesale hide of `#cesium-credits`. No second satellite poller/menu. Preserve R17 palette + R18 shared shell.

## Imagery provenance (R19-1)

- Worldwide overview: EOxCloudless 2016 (CC BY 4.0) + NASA GIBS Blue Marble
- Close-zoom LA: USDA NAIP public domain PMTiles `caelrion-la-aerial-r01-cc7ee43c04ab.pmtiles`
- Huntington Beach startup remains outside NAIP footprint (honest limited-coverage past EOx max)

## Tests (host)

- `format` / `format:check` — exit 0
- `check:boundaries` — exit 0
- Focused R19 + `creditAttribution` — exit 0
- `vite build` — exit 0 → `dist/assets/index-DSRx4mbk.js` / `index-BA70hH4U.css` (local Node 20 build; CI Node 24/26 is release authority)
- Full parallel unit suite on this host: `annotationEngine.test.mjs` runaway under RAM pressure (pre-existing host defect, not R19 surface); remaining suite exercised with concurrency 2

## Release afterstate

Recorded after merge + static deploy + cold verify (see `evidence/view-r19-clean-globe/prod-cold/`).
