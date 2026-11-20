# R16 — Owned LA aerial (NAIP) artifact custody

**Do not commit the `.pmtiles` binary to git.**

| Field | Value |
|-------|-------|
| Artifact | `caelrion-la-aerial-r01-cc7ee43c04ab.pmtiles` |
| SHA-256 | `cc7ee43c04abd98fc6ffe11af50789beed23cc89963cca9701887e8184b83dff` |
| Bytes | `65411958` (~62 MiB) |
| Custody | `/opt/caelrion/view-map-artifacts/` |
| Served URL | `/assets/maps/caelrion-la-aerial-r01-cc7ee43c04ab.pmtiles` |
| Source | USDA NAIP via Microsoft Planetary Computer STAC (`naip`) |
| Acquisition | 2022-05 California 60 cm |
| Licence | Public Domain (USDA FSA NAIP / U.S. Government work) |
| User-facing name | Satellite |
| Accurate description | Aerial orthophotography (not orbital satellite) |
| Bounds (W,S,E,N) | `-118.42, 33.98, -118.08, 34.18` |
| Zooms | 10–16 |
| Tile format | JPEG RGB |
| GSD (processed) | 2.4 m |
| GDAL | 3.8.4 |
| PMTiles CLI | 1.31.2 |

Install with the View static release (preserve the R15 vector archive):

```bash
mkdir -p /opt/caelrion/core/view/dist/assets/maps
install -m 644 /opt/caelrion/view-map-artifacts/caelrion-la-aerial-r01-cc7ee43c04ab.pmtiles \
  /opt/caelrion/core/view/dist/assets/maps/
# Do not delete caelrion-basemap-r01-822f068466c7.pmtiles
```

Processing receipt: `/opt/caelrion/view-map-artifacts/r16-naip/R16_AERIAL_ARTIFACT.json`
