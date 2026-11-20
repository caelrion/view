# R11 — V1.2 Satellite-Hybrid UI (source candidate)

**Branch:** `feature/view-argos-v12-r11-r01`  
**Baseline:** V1.1 production `f69525d78c5785ce66e85ff35278410a24194c28` / tree `d0fb0b4c2cd7dd2bf0581afe153f0faec6c742d6`  
**Scope:** Thin-client UI only — MapLibre satellite-hybrid, Argos palette/rail, LA startup, basemap banner semantics.

## Satellite source

| Item | Value |
|------|-------|
| Primary | Esri World Imagery XYZ (`services.arcgisonline.com/.../World_Imagery/MapServer/tile/{z}/{y}/{x}`) |
| Overlay | OpenFreeMap planet vector (roads + place labels) |
| Fallback | OpenFreeMap Fiord (`styles/fiord`) → state `satellite-unavailable` |
| Offline | Slate stub → state `offline` |
| Auth | Keyless ArcGIS Online classic endpoint (same as Cesium `createEsriImagery`); attribution required |
| Not used | MapTiler Hybrid (403 without key); ArcGIS basemaps-api style (token); Argos tiles |

## Default camera

```js
center: [-118.2437, 34.0522], // Los Angeles
zoom: 10.5,
bearing: 0,
pitch: 0
```

`setAircraft(record)` does **not** move the camera (`moveCamera` defaults false).

## Banner states

| State | Banner |
|-------|--------|
| `ready` / `loading` | Hidden |
| `satellite-unavailable` | `SATELLITE UNAVAILABLE — VECTOR FALLBACK` |
| `offline` | `BASEMAP OFFLINE` |

## Palette (`:root` in `argos-atlas.css`)

Charcoal `#1F201C`, panel olive `#2E2C22`, cyan `#11ACA9`, gold `#E8BC3B`, pink `#D67680`, blue `#80A2D6`, purple `#8A6AFF`.

## Evidence

`docs/argos-baseline/evidence/view-argos-v12-r11-r01/`

## Production

**Not deployed** in this step — source branch only until separately authorized.
