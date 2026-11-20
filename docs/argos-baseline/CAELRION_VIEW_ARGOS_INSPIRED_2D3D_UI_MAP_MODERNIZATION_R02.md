# CAELRION VIEW — ARGOS ATLAS VISUAL DUPLICATE UI & MAP MODERNIZATION R02

**Coordinate:** `CAELRION_VIEW_ARGOS_INSPIRED_2D3D_UI_MAP_MODERNIZATION_R02`  
**Supersedes for product goal:** R01 “Argos-inspired” language  
**Prepared by:** OWEN / OOS / BSB  
**Implementation:** Cursor  
**Coordination:** WING and AREN  
**Independent advisory review:** LEXA  
**Repository:** `https://github.com/caelrion/view`

### Objective (R02 revision)

Faithfully reproduce the **publicly observable** Argos Atlas UI, styling, geometry, map appearance, and visual interactions within `view.caelrion.com`, under **Caelrion** branding. Do not treat Argos as loose design inspiration or a generic dark dashboard. An original Caelrion redesign is a **later** project.

Retain God's Eye View capabilities, CesiumJS 3D, incumbent live-data connectors, tracking, and architecture. View remains a **thin frontend**; shared Caelrion backend owns ingestion, secrets, canonical IDs, and durable intelligence. Where a backend projection is not admitted, use a plainly marked **DEMO** fixture and return `BACKEND_CONTRACT_PENDING` — do not invent browser pollers or new tracking services.

### V00 — Reference capture and source inventory

- Capture Argos's map UI at desktop, ultrawide and mobile resolutions.
- Catalog all visible control states: top navigation, search, layer filters, context panels, map tools, selection, tracking and loading/errors.
- Compare against the actual current `caelrion/view` source.
- Pin repository HEAD, commit, tree and affected file SHA values.
- Identify which Argos behaviors are actually observable rather than inferred.
- License manifest for tiles/styles/fonts; one aircraft UI contract/fixture.

**Deliverable:** Screen-by-screen visual specification, source-impact matrix and preserved baseline.

### V01 — Argos-matched Caelrion shell

Recreate the observable Argos layout with Caelrion branding:

- Compact charcoal/black header and floating controls.
- Thin cyan/teal borders and selection highlights.
- Smaller squared panels rather than large rounded glass cards.
- Licensed Inter / Open Sans / Noto Sans / IBM Plex Mono stacks (no Argos marks).
- Dense, readable telemetry using monospaced numerals.
- Contextual navigation rail and collapsible panels.
- Consistent entity colors for aircraft and reserved layers.
- Refined hover, focus, selection, loading and error states; UNAVAILABLE/DEMO honesty.

**Deliverable:** Responsive shared stylesheet and working application shell, with original specialized modes preserved.

### V02 — Dark interactive 2D map + one aircraft

- Integrate MapLibre GL JS with the existing Vite application.
- Implement CARTO Dark Matter-compatible visual styling using legitimately licensed vector tiles (OpenFreeMap dark; not Argos runtime URLs).
- Preserve geography, roads, coastlines, labels, borders, waterways and map attribution.
- Provide map zoom, pan, rotate and supported style choices.
- Retain existing CesiumJS, Esri imagery and supported 3D basemaps.
- Exactly one selectable aircraft presentation via pure display adapter + DEMO or backend projection.
- Handle unavailable tiles or map resources without breaking the application.

**Deliverable:** Operational interactive dark 2D vector map with one aircraft; Cesium still boots.

### V03 — Shared real-time data visualization

*(Not in first Cursor handoff slice.)*

Use the current application's existing data services and layer catalog.

Add 2D representations for already supported aircraft, military flights, vessels, satellites, cameras, weather, earthquakes, fires and other admitted layers.

Implement heading-oriented markers, zoom-dependent density, clustering, track lines, selection highlights and source-freshness indicators.

**Critical constraint:** No duplicated feed polling, fabricated live counts, parallel provider registry or independently invented tracking database.

**Deliverable:** Existing supported live layers rendered correctly in both 2D and 3D where applicable.

### V04 — Navigation, filters and entity panels

*(Not in first Cursor handoff slice — partial chrome may exist from V01.)*

Implement the Argos-style layout fully bound to real data:

- Top logo/search/status bar.
- Compact right-side navigation rail.
- Layer-specific filter panels with real counts.
- Left-side contextual detail cards.
- Aircraft registration, altitude, heading, speed and routes when available.
- Vessel, camera, satellite and infrastructure detail views from existing source data.
- Globe inset, UTC clock and coordinate display.
- Lower-right zoom, map mode and attribution controls.
- Bottom information strip only where genuine data is available.

**Deliverable:** Fully interactive contextual interface. No decorative buttons pretending to operate nonexistent services.

### V05 — Seamless 2D / 3D interaction

*(Not in first Cursor handoff slice — minimal switch/teardown only in V02.)*

- Switch between MapLibre 2D and CesiumJS 3D.
- Preserve geographic focus and approximately equivalent camera framing.
- Preserve selected target, enabled layers and tracking when possible.
- Retain existing shareable state and deep-link behavior.
- Support restoring a valid selected aircraft directly from a URL.
- Preserve existing cockpit, sensor, voice and specialized 3D controls.

**Deliverable:** Both maps operate as views of the same application, not two disconnected products.

### V06 — Desktop, ultrawide and mobile

*(Not in first Cursor handoff slice — basic responsive CSS may exist from V01.)*

- Fit conventional desktops and ultrawide workstations.
- Support narrow mobile screens and touch controls.
- Prevent panel overlaps, map obstruction and viewport overflow.
- Support keyboard navigation and visible focus states.
- Optimize rendering and network workloads.
- Recover gracefully from WebGL context loss, tile failures and stale feeds.

**Deliverable:** Responsive layout verified at representative desktop, ultrawide and mobile viewport sizes.

### V07 — Engineering and visual acceptance

*(Partial in first slice: P1–P5 / H1–H4 unit + build/boundaries.)*

Run actual positive and hostile tests with recorded commands and exit codes.

Verify functional 2D/3D, no duplicated data requests, attribution, failed tiles, invalid IDs, keyboard/mobile, no specialized-mode regressions, screenshot deltas vs reference.

**Deliverable:** Source-integrity report, actual test results and visual regression evidence.

### V08 — Publication and live verification

Keep the following milestones separate:

1. Source prepared and tested on an isolated branch.
2. Pull request reviewed and published under current repository permissions.
3. Authorized merge and deployment.
4. Production browser verification at `view.caelrion.com`.
5. Independent acceptance based on working UI, actual network requests and representative live entities.

A successful source build does not establish that the public website has changed.

### Implementation sequence

**First bounded slice:** V00 + V01 + V02, with one aircraft presentation (DEMO if no backend contract).

**Second slice:** Shared layer presentations, contextual cards, filters and tracking.

**Third slice:** 2D/3D continuity, responsiveness, performance and full regression qualification.

**Final:** Authorized deployment and independently observed live acceptance.

### Non-negotiable exclusions

- No wholesale rewrite of God's Eye View.
- No replacement of CesiumJS.
- No unnecessary React/Next.js migration.
- No duplicated API/data provider systems.
- No new Fabric, authority root or backend registry.
- No copying Argos proprietary source, branded assets or unlicensed data feeds.
- No falsely claimed implemented Argos premium features.
- No dependency on the unrelated production SOURCE_EDIT recovery unless a real shared dependency is demonstrated.
- No deployment, protected approval or institutional acceptance inferred from an incomplete slice.

**Acceptance objective:** High-fidelity visual duplicate of publicly observable Argos Atlas UI/map under Caelrion branding, while preserving working capabilities already owned by Caelrion.

## 12. CONTINUATION / CHECKPOINT LEDGER

### 2026-11-20 — Cursor Handoff R01 / V00–V02 first slice

- **Branch:** `feature/view-argos-baseline-v00-v02-r01`
- **Baseline HEAD / tree:** `32c52db7be18e441d8743e446214b7e209269c0f` / `1c822560351bc7f360ba9c3640024cc1f8711ec8`
- **Done:** V00 matrix + license manifest + aircraft contract; V01 Caelrion Argos-matched shell; V02 MapLibre dark map + one DEMO aircraft `ae07f6`; mode toggle `?view=argos-2d` / `?map=2d`; MapLibre resize + canvas fill; targeted unit P/H tests (12/12); `npm run build` 0; `npm test` 0 (node:24-bookworm+git); `npm run check:boundaries` 0; local screenshots 1920/1440/390
- **Holds:** Live Argos interactive map capture blocked by account splash (auth-block screenshot retained); `npm run qa:map-source-tray` exit 1 (Puppeteer Chrome for Testing unavailable — environmental)
- **Not started:** V03–V08; no deploy
- **Backend:** `BACKEND_CONTRACT_PENDING` — DEMO fixture only on 2D path
- **Evidence root:** `/var/lib/caelrion-host-config-custody/evidence/view-argos-baseline-v00-v02-r01/`
- **Outcome class:** `C_PARTIAL_WITH_EVIDENCE` (first-slice source E1 with environmental holds; not production; not full Argos parity)
