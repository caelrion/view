# R12 — Esri World Imagery production-use rights gate

**Coordinate:** `CAELRION_VIEW_V12_SATELLITE_UI_PRODUCTION_RELEASE_R12`  
**Predicate:** `V12_ESRI_WORLD_IMAGERY_PUBLIC_PRODUCTION_USE_ELIGIBILITY_NOT_EVIDENCED`  
**Status:** **UNSATISFIED** (2026-11-20)  
**Accountable owner (entitlement decision):** Mario  
**Accountable owner (source wiring after entitlement):** View frontend / Cursor custodian

## Endpoint in V1.2 source

```
https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}
```

- Classic ArcGIS Online World Imagery MapServer XYZ tiles.
- Used keyless in MapLibre V1.2 (`createSatelliteHybridStyle`).
- Same host path as Cesium `createEsriImagery()` (V1.1 3D stack).
- **Not** the authenticated ArcGIS Basemap Styles service (`basemapstyles-api.arcgis.com` / `arcgis/imagery`).

## What was inspected

| Source | Finding |
|--------|---------|
| Esri “items owned by Esri in ArcGIS Online” FAQ summary (updated **2025-04-21**) | Use of Esri-owned AGOL items requires **Esri software or an ArcGIS Online subscription**, with attribution. Without Esri software: **purchase an ArcGIS Online subscription**. Living Atlas content for **commercial use in an application/product** requires contacting Esri. May not systematically harvest, redistribute, or self-host tiles. |
| Esri Web Site and Service Terms of Use | Distinguishes noncommercial vs commercial use; commercial use requires applicable license/fee. Esri may discontinue free ArcGIS Online service access at discretion. |
| ArcGIS Location Platform product FAQ / licensing | Commercial / revenue-generating apps **are** permitted **when** every Location Service request (including basemaps) is authenticated with an access token from a Location Platform subscription. Free signup + monthly free tier (tile- or session-based). MapLibre is an explicitly supported client. |
| Host credentials (`core/.env.local`, View env examples) | **No** `ESRI_*` / `ARCGIS_*` / MapTiler API key present for basemap authentication. |
| `DATA_SOURCES.md` Esri row | Soft operational note (“usable… with attribution… at scale should review Location Platform terms”) — **not** a contract, subscription ID, or written licence receipt. |
| Cesium V1.1 keyless Esri stack | Technical coexistence only. **Does not** evidence a qualifying production entitlement for a new MapLibre imagery route. |

## Determination

**Current Esri use is NOT qualified for this V1.2 production deployment.**

Reasons:

1. No evidenced ArcGIS Online subscription, ArcGIS Location Platform subscription, written Esri licence, or Developer/Location Platform API key applicable to Caelrion View production.
2. Keyless classic World Imagery tile access loading successfully **does not** establish unrestricted public/commercial permission.
3. Location Platform’s documented commercial path requires **authenticated** basemap requests — the V1.2 candidate does not authenticate.
4. Inferring eligibility from Cesium compatibility or from tiles returning HTTP 200 is forbidden by this gate.

## Permitted correction paths (Mario authorization required before purchase/activation)

### Path 1 — ArcGIS Location Platform (preferred MapLibre-compatible)

1. Mario authorizes a free ArcGIS Location Platform account at location.arcgis.com (or confirms an existing org entitlement).
2. Issue an API key / access token scoped to basemap styles.
3. Wire MapLibre to the official authenticated imagery style (e.g. `arcgis/imagery` via Esri MapLibre basemap helper) with required attribution.
4. Respect free-tier then pay-as-you-go limits (public pricing: tile-based ~2M free tiles/month then ~$0.15/1k; or session-based ~1k free sessions/month then ~$4/1k sessions — confirm live pricing at signup).
5. Store the token only in host-local secrets (never commit).

### Path 2 — MapTiler Hybrid (commercial)

1. Mario authorizes a MapTiler account with commercial-use terms covering Hybrid satellite.
2. Supply `MAPTILER_KEY` via host secrets.
3. Swap MapLibre style URL to the licensed Hybrid style; keep Fiord fallback.

### Path 3 — No satellite for production

Keep V1.1 production live (Fiord). Retain V1.2 UI source on the feature branch/PR without merging imagery into production until Path 1 or 2 lands.

## What this gate does **not** block

- Opening the V1.2 GitHub PR.
- Running CI on the candidate.
- Preview / non-production browser acceptance of the R11 UI.
- Independent palette, LA camera, banner, and Fiord-fallback work already in source.

## What this gate **does** block

- Merge to `main` as a production satellite release.
- `rsync` of a satellite-primary build to `/opt/caelrion/core/view/dist`.
- Claiming Outcome A (`V12_PRODUCTION_COLD_VERIFIED`) for Esri keyless World Imagery.

## Receipt

```yaml
predicate: V12_ESRI_WORLD_IMAGERY_PUBLIC_PRODUCTION_USE_ELIGIBILITY_NOT_EVIDENCED
status: unsatisfied
endpoint: services.arcgisonline.com/.../World_Imagery/MapServer
auth_present: false
agol_subscription_evidenced: false
location_platform_token_evidenced: false
cesium_keyless_not_treated_as_licence: true
production_deploy_blocked: true
minimum_correction: Mario-authorized ArcGIS Location Platform token + authenticated MapLibre imagery style (or MapTiler commercial Hybrid)
```
