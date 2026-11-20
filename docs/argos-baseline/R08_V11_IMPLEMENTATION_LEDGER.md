# R08 / V1.1 Implementation Ledger (R01)

Branch: `feature/view-argos-v11-r08-r01`
Baseline: `3aadc626…` / `67cbb3f2…` (production V1 pin — unchanged on `main`)

## Implemented (P0 + targeted P1)

| Area | Change |
|------|--------|
| Cartography | OpenFreeMap **Fiord** + bounded paint overrides (roads/labels/boundaries) |
| Layers | Full-height desktop category rail; mobile bottom drawer; collapsed by default on ≤720px |
| Header/panels | Lighter slate panels; reduced opacity; compact header; DEMO preserved |
| 3D toggle | Floating duplicate hidden in 2D; visible return control in Cesium |
| Basemap errors | Tile/glyph soft-fail; style-fatal → BASEMAP OFFLINE + Retry |
| Interactions | Larger hit target; Enter/Space/Escape; DEMO aircraft show/hide |
| Startup UX | Compact dark attribution (no white strip); filters+detail closed; local-only search |

## Startup UX correction (same branch)

| Check | Result |
|-------|--------|
| Attribution | MapLibre compact collapsed on load; dark chip; disclosure retains OFM/OSM |
| Menus | Layers `aria-expanded=false`; DEMO marker without auto-select/detail |
| Search | Local presets + coords + DEMO id/callsign + loaded map labels; honest empty |
| Preview | `http://127.0.0.1:4174/?welcome=0` — no production deploy |
| Tests | `localSearch`/`mode`/`presenter`/`style` unit + `scripts/qa-argos-startup-ux.mjs` exit 0 |

## Deferred (P2)

Enhanced mini-globe, conversational dock, extra scene density.

## Package gap

`CAELRION_VIEW_ARGOS_UI_ONLY_FULL_SUCCESSOR_CHECKLIST_R08.md` and `references/Screenshot_A|B_*.png` were **not deposited** on this host. Comparison **C (Argos reference)** pending Mario package drop.

## Preview

Local nonprod: `http://127.0.0.1:4174/?welcome=0` (vite preview; not production).
