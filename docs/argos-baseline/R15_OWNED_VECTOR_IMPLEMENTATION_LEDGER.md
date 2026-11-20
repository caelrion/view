# R15 — Owned vector basemap implementation ledger

**Branch:** `feature/view-argos-v12-r11-r01` (PR #3)  
**Supersedes for default 2D:** R12 Esri entitlement blocker (`R12_ESRI_WORLD_IMAGERY_RIGHTS_GATE.md`)

## Product

Self-hosted Protomaps v4 dark vector basemap with Argos charcoal/olive UI. Not a satellite photograph.

## Artifact

See `R15_OWNED_BASEMAP_ARTIFACT.md`.

## Static delivery (qualified)

| Check | Result |
|-------|--------|
| Host path | `/assets/*` via `view_static` (no SPA `try_files`) |
| Range fixture | `https://view.caelrion.com/assets/maps/range-fixture.pmtiles` |
| HTTP | `206` + `Content-Range: bytes 0-1023/2434587` |
| Magic | `PMTiles` header |
| Missing asset | `404` (not HTML) |

## States

`loading` · `ready` · `limited-coverage` · `offline`

## Default camera

`[-118.2437, 34.0522]`, zoom `10.5`
