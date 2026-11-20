# R15 — Owned basemap artifact custody

**Do not commit the `.pmtiles` binary to git.**

| Field | Value |
|-------|-------|
| Artifact | `caelrion-basemap-r01-822f068466c7.pmtiles` |
| SHA-256 | `822f068466c79112046e1ccbc4e93c306110d208a535d746a19bc84aed729d55` |
| Bytes | `790349026` (~754 MiB) |
| Host path (build/custody) | `/opt/caelrion/view-map-artifacts/` |
| Served URL | `/assets/maps/caelrion-basemap-r01-822f068466c7.pmtiles` |
| Source build | `https://build.protomaps.com/20261118.pmtiles` |
| Source ETag | `f80d23ebf8f97045b56ad0bc73b8ec76-521` |
| OSM replication time | `2026-11-18T04:00:00Z` |
| Schema | Protomaps basemap v4 / MVT (`version` 4.15.2) |
| Global zooms | 0–7 |
| SoCal detail | z8–15, bbox `[-121.5, 32.4, -114.0, 35.9]` |

Install with the View static release:

```bash
mkdir -p /opt/caelrion/core/view/dist/assets/maps
install -m 644 /opt/caelrion/view-map-artifacts/caelrion-basemap-r01-822f068466c7.pmtiles \
  /opt/caelrion/core/view/dist/assets/maps/
```

Glyphs/sprites ship in the app build under `/assets/basemaps/`.
