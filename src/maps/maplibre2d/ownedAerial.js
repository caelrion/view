/**
 * R17/R19 streamed worldwide photographic basemap (MapLibre 2D "Satellite").
 *
 * Primary: EOxCloudless 2016 (CC BY 4.0) — on-demand WMTS, no local planet cache.
 * Low zoom: NASA GIBS Blue Marble Next Generation.
 * Close zoom inside verified LA NAIP footprint: owned USDA NAIP PMTiles (R16/R19-1).
 * Labels/roads: owned Protomaps PMTiles overlays (SoCal detail + global overview).
 *
 * Does not download, mosaic, or host a worldwide imagery archive on the droplet.
 */
import { layers } from '@protomaps/basemaps';
import { OWNED_PMTILES_PATH, createArgosDarkFlavor } from './ownedBasemap.js';
import {
  applyProgressiveRoadDetail,
  applySatelliteResidentialRestraint,
  applySatelliteSelectiveGoldRoads,
  SATELLITE_PRIMARY_NEUTRAL,
} from './zoomDetail.js';
import {
  createSatelliteNightWaterLayer,
  nightFactorForMapCenter,
  rasterPaintForNightFactor,
  waterTintOpacityForNightFactor,
} from './solarDayNight.js';

/** EOxCloudless 2016 — Web Mercator WMTS (TileMatrix/TileRow/TileCol = z/y/x). */
export const EOX_CLOUDLESS_2016_TILE_URL =
  'https://tiles.maps.eox.at/wmts/1.0.0/s2cloudless_3857/default/g/{z}/{y}/{x}.jpg';

/** NASA GIBS Blue Marble — global true-color overview (low zoom). */
export const GIBS_BLUE_MARBLE_TILE_URL =
  'https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/BlueMarble_NextGeneration/default/GoogleMapsCompatible_Level8/{z}/{y}/{x}.jpeg';

export const EOX_MIN_ZOOM = 5;
export const EOX_MAX_ZOOM = 14;
export const GIBS_MAX_ZOOM = 8;

/**
 * R16 LA NAIP archive — R19-1 close-zoom detail inside verified LA footprint.
 * Worldwide overview remains EOx/GIBS; NAIP is not a planet substitute.
 */
export const OWNED_AERIAL_ARTIFACT = Object.freeze({
  id: 'caelrion-la-aerial-r01',
  filename: 'caelrion-la-aerial-r01-cc7ee43c04ab.pmtiles',
  sha256: 'cc7ee43c04abd98fc6ffe11af50789beed23cc89963cca9701887e8184b83dff',
  bytes: 65411958,
  status: 'r19-close-zoom-detail',
  provenance: 'USDA NAIP via Microsoft Planetary Computer STAC (naip)',
  licence: 'Public Domain (USDA FSA NAIP / U.S. Government work)',
  acquisition: '2022-05 California 60 cm (processed GSD ~2.4 m)',
  minzoom: 10,
  maxzoom: 16,
  note: 'Close-zoom LA detail over EOx/GIBS worldwide overview',
});

export const OWNED_AERIAL_PMTILES_PATH = `/assets/maps/${OWNED_AERIAL_ARTIFACT.filename}`;

/** Verified NAIP geographic footprint (W,S,E,N). */
export const NAIP_LA_BOUNDS = Object.freeze({
  west: -118.42,
  south: 33.98,
  east: -118.08,
  north: 34.18,
});

/** @deprecated R17 — worldwide imagery has no local footprint gate. */
export const AERIAL_COVERAGE_BOUNDS = Object.freeze({
  west: -180,
  south: -85,
  east: 180,
  north: 85,
});

export const MAP_ATTRIBUTION_HTML_AERIAL =
  '<a href="https://s2maps.eu" target="_blank" rel="noopener">Sentinel-2 cloudless</a> by ' +
  '<a href="https://eox.at" target="_blank" rel="noopener">EOX IT Services GmbH</a> ' +
  '(Contains modified Copernicus Sentinel data 2016 &amp; 2017) · ' +
  '<a href="https://earthobservatory.nasa.gov/features/BlueMarble" target="_blank" rel="noopener">NASA Blue Marble</a> · ' +
  'USDA NAIP (public domain) where covered · ' +
  '© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> labels';

/** @param {number} lon @param {number} lat */
export function isInNaipCoverage(lon, lat) {
  return (
    Number.isFinite(lon) &&
    Number.isFinite(lat) &&
    lon >= NAIP_LA_BOUNDS.west &&
    lon <= NAIP_LA_BOUNDS.east &&
    lat >= NAIP_LA_BOUNDS.south &&
    lat <= NAIP_LA_BOUNDS.north
  );
}
/**
 * R21–R28 Satellite road hierarchy (Mario visual target):
 *   highways → soft gold emphasis (R27 soften; R28 highway-only)
 *   trunk/primary arterials → neutral off-white (not gold)
 *   secondary/tertiary/local → faint off-white
 * Dark-mode palette stays in createArgosDarkFlavor(); this flavor is Satellite-only.
 */
export const SATELLITE_HIGHWAY_GOLD = '#D2B56A';
/** @deprecated R28 — trunk is no longer gold; kept for rollback/docs. */
export const SATELLITE_MAJOR_GOLD = '#BFA876';
/** Cool off-white — kept distinct from gold so residential never reads as highlight. */
export const SATELLITE_RESIDENTIAL = '#C8D0D4';

/** Light overlay flavor for roads/labels on photographic imagery. */
export function createAerialOverlayFlavor() {
  const base = createArgosDarkFlavor();
  const halo = 'rgba(23, 32, 39, 0.85)';
  const goldHalo = 'rgba(28, 22, 10, 0.78)';
  return {
    ...base,
    background: '#171D23',
    earth: '#20272D',
    water: '#102D40',
    buildings: 'rgba(48, 58, 64, 0.15)',
    highway: SATELLITE_HIGHWAY_GOLD,
    // R28: trunk/major paint starts neutral; selective gold keeps highway only.
    major: SATELLITE_PRIMARY_NEUTRAL,
    minor_a: SATELLITE_RESIDENTIAL,
    minor_b: SATELLITE_RESIDENTIAL,
    link: SATELLITE_HIGHWAY_GOLD,
    other: SATELLITE_RESIDENTIAL,
    minor_service: SATELLITE_RESIDENTIAL,
    pier: SATELLITE_RESIDENTIAL,
    tunnel_other: SATELLITE_RESIDENTIAL,
    tunnel_minor: SATELLITE_RESIDENTIAL,
    tunnel_link: SATELLITE_HIGHWAY_GOLD,
    tunnel_major: SATELLITE_PRIMARY_NEUTRAL,
    tunnel_highway: SATELLITE_HIGHWAY_GOLD,
    bridges_other: SATELLITE_RESIDENTIAL,
    bridges_minor: SATELLITE_RESIDENTIAL,
    bridges_link: SATELLITE_HIGHWAY_GOLD,
    bridges_major: SATELLITE_PRIMARY_NEUTRAL,
    bridges_highway: SATELLITE_HIGHWAY_GOLD,
    city_label: '#F7FAFC',
    city_label_halo: halo,
    subplace_label: '#E5EBEF',
    subplace_label_halo: halo,
    state_label: '#B8C6CE',
    state_label_halo: halo,
    country_label: '#F7FAFC',
    roads_label_major: '#D2C48E',
    roads_label_major_halo: goldHalo,
    roads_label_minor: '#D8DEE2',
    roads_label_minor_halo: halo,
    address_label: '#D8DEE2',
    address_label_halo: halo,
    boundaries: 'rgba(232, 236, 240, 0.55)',
  };
}

const AERIAL_OVERLAY_KEEP =
  /^(roads_|boundaries|places_|address_label|water_waterway_label|water_label_|earth_label_|pois|roads_shields|roads_oneway)/;

const AERIAL_OVERLAY_DROP =
  /^(background|earth$|landcover|landuse_|water$|buildings|roads_runway|roads_taxiway)/;

/**
 * Filter Protomaps layers to road/label/boundary overlays suitable over imagery.
 * @param {object[]} allLayers
 */
export function selectAerialOverlayLayers(allLayers) {
  return allLayers.filter((layer) => {
    const id = String(layer.id || '');
    if (AERIAL_OVERLAY_DROP.test(id)) return false;
    return AERIAL_OVERLAY_KEEP.test(id);
  });
}

/**
 * Resolve night factor for Satellite style construction (R26 first-frame).
 * Prefer an explicit factor; otherwise compute from known center + UTC.
 * @param {{ nightFactor?: number, center?: [number, number]|{lon:number,lat:number}|null, nowMs?: number }} [opts]
 */
export function resolveSatelliteNightFactor({
  nightFactor,
  center = null,
  nowMs = Date.now(),
} = {}) {
  if (Number.isFinite(Number(nightFactor))) {
    return Math.max(0, Math.min(1, Number(nightFactor)));
  }
  let lon;
  let lat;
  if (Array.isArray(center) && center.length >= 2) {
    lon = Number(center[0]);
    lat = Number(center[1]);
  } else if (center && typeof center === 'object') {
    lon = Number(center.lon ?? center.lng);
    lat = Number(center.lat);
  }
  if (Number.isFinite(lat) && Number.isFinite(lon)) {
    return nightFactorForMapCenter({ lat, lon, nowMs });
  }
  return 0;
}

/**
 * MapLibre style: streamed EOx/GIBS imagery + owned vector overlays.
 * Imagery tiles are requested only for the visible viewport (MapLibre default).
 *
 * R26: bake solar raster/water paint into the style JSON so the first visible
 * frame matches the startup center's day/night state (no post-load flash).
 */
export function createOwnedAerialStyle({
  vectorUrl = OWNED_PMTILES_PATH,
  nightFactor,
  center = null,
  nowMs = Date.now(),
} = {}) {
  const sourceUrl = vectorUrl.startsWith('pmtiles://')
    ? vectorUrl
    : `pmtiles://${vectorUrl}`;
  const factor = resolveSatelliteNightFactor({ nightFactor, center, nowMs });
  const rasterDn = rasterPaintForNightFactor(factor);
  const waterOpacity = waterTintOpacityForNightFactor(factor);
  // Progressive → residential restraint → R26 selective gold (trunk/primary only).
  const overlay = applySatelliteSelectiveGoldRoads(
    applySatelliteResidentialRestraint(
      applyProgressiveRoadDetail(
        selectAerialOverlayLayers(
          layers('protomaps', createAerialOverlayFlavor(), { lang: 'en' }),
        ),
      ),
    ),
    { residentialColor: SATELLITE_RESIDENTIAL },
  );
  const naipUrl = OWNED_AERIAL_PMTILES_PATH.startsWith('pmtiles://')
    ? OWNED_AERIAL_PMTILES_PATH
    : `pmtiles://${OWNED_AERIAL_PMTILES_PATH}`;
  return {
    version: 8,
    name: 'caelrion-streamed-eox-satellite',
    metadata: {
      'caelrion:satellite-night-factor': factor,
    },
    glyphs: '/assets/basemaps/fonts/{fontstack}/{range}.pbf',
    sprite: '/assets/basemaps/sprites/v4/dark',
    sources: {
      'gibs-blue-marble': {
        type: 'raster',
        tiles: [GIBS_BLUE_MARBLE_TILE_URL],
        tileSize: 256,
        maxzoom: GIBS_MAX_ZOOM,
        attribution: 'NASA Blue Marble Next Generation (GIBS)',
      },
      'eox-cloudless-2016': {
        type: 'raster',
        tiles: [EOX_CLOUDLESS_2016_TILE_URL],
        tileSize: 256,
        minzoom: EOX_MIN_ZOOM,
        maxzoom: EOX_MAX_ZOOM,
        attribution: 'Sentinel-2 cloudless by EOX IT Services GmbH (CC BY 4.0)',
      },
      'naip-la': {
        type: 'raster',
        url: naipUrl,
        tileSize: 256,
        minzoom: OWNED_AERIAL_ARTIFACT.minzoom,
        maxzoom: OWNED_AERIAL_ARTIFACT.maxzoom,
        attribution: 'USDA NAIP (public domain)',
        bounds: [
          NAIP_LA_BOUNDS.west,
          NAIP_LA_BOUNDS.south,
          NAIP_LA_BOUNDS.east,
          NAIP_LA_BOUNDS.north,
        ],
      },
      protomaps: {
        type: 'vector',
        url: sourceUrl,
        attribution:
          '© Protomaps · © OpenStreetMap contributors · Caelrion-hosted',
        maxzoom: 15,
      },
    },
    layers: [
      {
        id: 'background',
        type: 'background',
        paint: { 'background-color': '#0b1220' },
      },
      {
        id: 'gibs-blue-marble-raster',
        type: 'raster',
        source: 'gibs-blue-marble',
        maxzoom: EOX_MIN_ZOOM + 0.5,
        paint: {
          'raster-opacity': 1,
          'raster-fade-duration': 0,
          ...rasterDn,
        },
      },
      {
        id: 'eox-cloudless-raster',
        type: 'raster',
        source: 'eox-cloudless-2016',
        minzoom: EOX_MIN_ZOOM,
        paint: {
          'raster-opacity': 1,
          'raster-fade-duration': 0,
          ...rasterDn,
        },
      },
      {
        id: 'naip-la-raster',
        type: 'raster',
        source: 'naip-la',
        minzoom: OWNED_AERIAL_ARTIFACT.minzoom,
        maxzoom: OWNED_AERIAL_ARTIFACT.maxzoom + 1,
        paint: {
          'raster-opacity': [
            'interpolate',
            ['linear'],
            ['zoom'],
            9.5,
            0,
            10.2,
            1,
            16,
            1,
          ],
          'raster-fade-duration': 0,
          ...rasterDn,
        },
      },
      // R25/R26: water tint starts at the correct solar opacity (no post-load flash).
      createSatelliteNightWaterLayer({ fillOpacity: waterOpacity }),
      ...overlay,
    ],
  };
}

/** Alias retained for call sites. */
export const createStreamedSatelliteStyle = createOwnedAerialStyle;

/** @param {number} lon @param {number} lat */
export function isInAerialCoverage(lon, lat) {
  return Number.isFinite(lon) && Number.isFinite(lat);
}

/**
 * Streamed worldwide imagery — ready whenever camera is valid.
 * Beyond EOx max: ready inside verified NAIP footprint, else limited-coverage.
 * @returns {'ready'|'limited-coverage'}
 */
export function aerialCoverageState({ lon, lat, zoom }) {
  if (
    !Number.isFinite(lon) ||
    !Number.isFinite(lat) ||
    !Number.isFinite(zoom)
  ) {
    return 'ready';
  }
  if (zoom > EOX_MAX_ZOOM + 1.5) {
    return isInNaipCoverage(lon, lat) ? 'ready' : 'limited-coverage';
  }
  return 'ready';
}

export const OWNED_AERIAL_LICENSE = Object.freeze({
  claim:
    'Streamed EOxCloudless 2016 (CC BY 4.0) + NASA GIBS overview + USDA NAIP LA detail',
  data_license:
    'CC BY 4.0 (EOX 2016); NASA imagery credit required; USDA NAIP public domain',
  labels: 'ODbL (OpenStreetMap contributors) via Protomaps / OpenFreeMap',
  tile_runtime:
    'HTTPS WMTS/XYZ on demand + same-origin NAIP PMTiles for LA close zoom',
  user_facing_name: 'Satellite',
  note: '2018–2025 EOx noncommercial layers are not used',
  not_used: [
    'Esri World Imagery (keyless)',
    'MapTiler',
    'EOxCloudless 2018–2025 noncommercial public tiles',
    'Argos proprietary imagery',
    'Full-planet local PMTiles / MBTiles mosaic',
  ],
  eox_tile_url: EOX_CLOUDLESS_2016_TILE_URL,
  gibs_tile_url: GIBS_BLUE_MARBLE_TILE_URL,
  naip_artifact: OWNED_AERIAL_ARTIFACT,
  naip_bounds: NAIP_LA_BOUNDS,
});

/** Persistable 2D basemap mode ids. */
export const BASEMAP_MODE_DARK = 'dark-vector';
export const BASEMAP_MODE_SATELLITE = 'owned-aerial';
export const BASEMAP_MODE_STORAGE_KEY = 'caelrion.view.basemapMode';
