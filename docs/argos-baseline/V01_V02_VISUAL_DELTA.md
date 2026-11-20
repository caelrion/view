# P5 — Visual delta checklist (first-slice states)

Compared Argos public blog stills (reference-only) to Caelrion Argos-standard shell + MapLibre dark map.

| Aspect | Argos reference | Caelrion first slice | Delta |
|--------|-----------------|----------------------|-------|
| Top brand | ARGOS ATLAS + tagline left | CAELRION VIEW + tagline left | Branding intentional |
| Header height / density | Low-profile dark bar | `--argos-header-h: 52px`, dark gradient | Close; live measure UNKNOWN |
| Search | Centered search (retired in current Argos DOM to cmd-K; still visible in older blog stills) | Centered search field **disabled** + UNAVAILABLE chip | Honest UNAVAILABLE |
| Right filters | Narrow rail / drawer with counts | Right panel with Aircraft=1, others — | Extra layers DEMO/UNAVAILABLE |
| Left detail | Selected object card | Aircraft detail card from DEMO record | One aircraft only |
| Map | Dark vector streets/water/labels | OpenFreeMap `dark` style | Compatible dark; not pixel-identical CARTO export |
| Marker | Heading-aware aircraft iconography | Circle + ▲ heading + label (no proprietary sprite) | Silhouette differs; selectable |
| Bottom-left | Small globe inset + coords | Placeholder inset + UTC/lat-lon from map center | Globe inset not live 3D mini-map |
| Bottom-right | Zoom / attribution | MapLibre nav + attribution control | Present |
| Accents | Cyan/teal thin borders | `--argos-cyan: #3de7ff` | Matched family |
| Corner radius | Small squared panels | `4px` | Matched intent |
| 3D cockpit chrome | N/A in Argos 2D | Hidden via `.argos-atlas-active` without destroying Cesium | Preserved |

**Not claimed pixel-perfect.** Remaining deltas recorded above for later V03–V06 polish.
