# R18 — Unified 2D/3D presentation

**Coordinate:** `CAELRION_VIEW_R18_UNIFIED_2D_3D_PRESENTATION`  
**First failed predicate:** `CAELRION_3D_PRESENTATION_NOT_UNIFIED_WITH_2D`  
**Owner:** Incumbent View frontend/Cursor custodian  
**Base:** `48bc6aa0cafb89c08c6020fa188889d44f677594` (R17-P1 production main)

## Correction

- `_enter3D()` keeps the shared Argos/Caelrion shell visible (`argos-atlas-active` + `argos-atlas-3d`).
- Legacy GEV chrome (title bar, docks, panels, first-run, loading identity) is CSS-suppressed while the shared shell owns presentation.
- MapLibre host is non-interactive in 3D so the Cesium globe receives pan/zoom; starfield/skybox unchanged in `viewer.js`.
- Dark / Satellite from 3D returns to the 2D shell with the selected basemap.
- Visible branding → **Caelrion View** (`index.html`, scene chrome, loading HUD, Pinokio launcher, welcome tip).

## Non-goals

No Cesium replacement, no new skybox, no provider/API changes, no R17 map work restart.
