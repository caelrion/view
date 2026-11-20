# R17 — Worldwide streamed imagery + Huntington Beach

**Branch:** `feature/view-r17-global-streamed-hb`  
**Base:** `d4297eb` (R16 production main)

## Architecture

| Mode | Source | Hosted on droplet? |
|------|--------|--------------------|
| Dark | Owned Protomaps PMTiles (global z0–7 + SoCal z8–15) | Yes (existing 790 MB) |
| Dark (outside SoCal high zoom) | OpenFreeMap dark style (streamed) | No |
| Satellite | EOxCloudless 2016 WMTS + NASA GIBS Blue Marble | No — viewport tiles only |
| 3D | Existing Cesium | Unchanged |

## Rights

- EOx 2016: CC BY 4.0 commercial OK with attribution; fair-use public endpoint, no SLA
- EOx 2018–2025: **not used** (NC / paid)
- NASA GIBS Blue Marble: credit required
- No Esri World Imagery as default Satellite

## Camera

`center: [-117.99833, 33.66028]`, `zoom: 11.5` (Huntington Beach, CA)

## Storage

No planet download. No new worldwide PMTiles. Free disk confirmed before release.
