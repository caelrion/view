/**
 * Caelrion-owned Protomaps/PMTiles 2D basemap (R15 → R28).
 *
 * Default MapLibre presentation is same-origin PMTiles + self-hosted glyphs/sprites.
 * Does not use Esri World Imagery or MapTiler. Large archive is a deploy artifact —
 * not committed to git.
 *
 * R28: California statewide detail (z8–15) + global overview (z0–7).
 * R15 SoCal-only archive preserved immutable as caelrion-basemap-r01-*.
 */
import maplibregl from 'maplibre-gl';
import { Protocol } from 'pmtiles';
import { layers, namedFlavor } from '@protomaps/basemaps';
import { applyProgressiveRoadDetail } from './zoomDetail.js';

/** Huntington Beach, California default camera (MapLibre [lon, lat]). */
export const DEFAULT_MAP_CENTER = Object.freeze([-117.99833, 33.66028]);
export const DEFAULT_MAP_ZOOM = 11.5;

/**
 * California high-detail coverage (z8–z15), with modest border buffer.
 * Bbox used for extract: [-125.0, 32.0, -113.5, 42.5].
 */
export const CALIFORNIA_DETAIL_BOUNDS = Object.freeze({
  west: -125.0,
  south: 32.0,
  east: -113.5,
  north: 42.5,
});

/**
 * @deprecated R28 — use CALIFORNIA_DETAIL_BOUNDS. Kept as the prior SoCal
 * footprint for evidence/docs; coverage checks use California.
 */
export const SOCAL_DETAIL_BOUNDS = Object.freeze({
  west: -121.5,
  south: 32.4,
  east: -114.0,
  north: 35.9,
});

/** Zooms above this outside California report limited-coverage (not offline). */
export const OWNED_GLOBAL_MAX_ZOOM = 7;

/**
 * Immutable deploy artifact identity (bytes live outside git).
 * File: /assets/maps/<filename> on the static host.
 * R01 SoCal archive remains on disk; R28 installs r02 statewide.
 */
export const OWNED_BASEMAP_ARTIFACT = Object.freeze({
  id: 'caelrion-basemap-r02',
  filename: 'caelrion-basemap-r02-b0c934a219c8.pmtiles',
  sha256: 'b0c934a219c857aa389a635b09162bbd74131347dfed1e7378965ec45eb9515a',
  bytes: 1793865770,
  source_build: 'https://build.protomaps.com/20261118.pmtiles',
  source_etag: 'f80d23ebf8f97045b56ad0bc73b8ec76-521',
  source_osm_time: '2026-11-18T04:00:00Z',
  tile_schema: 'Protomaps basemap v4 / MVT',
  version_label: '4.15.2',
  zooms: {
    global: '0-7',
    california_detail: '8-15',
  },
  california_bbox: [-125.0, 32.0, -113.5, 42.5],
  /** Prior SoCal detail bbox (R15) — superseded for coverage, archive preserved. */
  socal_bbox_r01: [-121.5, 32.4, -114.0, 35.9],
  supersedes: 'caelrion-basemap-r01-822f068466c7.pmtiles',
  superseded_sha256:
    '822f068466c79112046e1ccbc4e93c306110d208a535d746a19bc84aed729d55',
});

export const OWNED_PMTILES_PATH = `/assets/maps/${OWNED_BASEMAP_ARTIFACT.filename}`;

export const MAP_ATTRIBUTION_HTML_OWNED =
  '© <a href="https://protomaps.com" target="_blank" rel="noopener">Protomaps</a> · ' +
  '© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> contributors (ODbL) · ' +
  'Caelrion-hosted vector basemap';

/**
 * R17-P1 Argos-like dark cartography — subdued road hierarchy over cool land.
 * Gold remains UI-only; streets must not dominate terrain.
 */
export function createArgosDarkFlavor() {
  const base = namedFlavor('dark');
  const halo = '#172027';
  return {
    ...base,
    background: '#171D23',
    earth: '#1C2527',
    park_a: '#23372E',
    park_b: '#23372E',
    wood_a: '#23372E',
    wood_b: '#23372E',
    scrub_a: '#23372E',
    scrub_b: '#23372E',
    water: '#0A2A38',
    glacier: '#1a242c',
    sand: '#243033',
    beach: '#283437',
    hospital: '#222b2e',
    industrial: '#20292c',
    school: '#222b2e',
    pedestrian: '#1C2527',
    aerodrome: '#1C2527',
    runway: '#2B363A',
    zoo: '#23372E',
    military: '#222b2e',
    buildings: '#2A3336',
    highway: '#47575B',
    major: '#374448',
    minor_a: '#2B363A',
    minor_b: '#2B363A',
    link: '#374448',
    other: '#2B363A',
    minor_service: '#293438',
    railway: '#243033',
    pier: '#2B363A',
    tunnel_other: '#2A3336',
    tunnel_minor: '#2A3336',
    tunnel_link: '#2A3336',
    tunnel_major: '#2A3336',
    tunnel_highway: '#2A3336',
    bridges_other: '#2B363A',
    bridges_minor: '#2B363A',
    bridges_link: '#374448',
    bridges_major: '#374448',
    bridges_highway: '#47575B',
    city_label: '#BBC8CA',
    city_label_halo: halo,
    subplace_label: '#9DAEB2',
    subplace_label_halo: halo,
    state_label: '#819298',
    state_label_halo: halo,
    country_label: '#BBC8CA',
    ocean_label: '#80A2D6',
    roads_label_major: '#9DAEB2',
    roads_label_major_halo: halo,
    roads_label_minor: '#819298',
    roads_label_minor_halo: halo,
    address_label: '#819298',
    address_label_halo: halo,
    boundaries: '#3a464a',
    landcover: {
      ...(base.landcover || {}),
      grassland: 'rgba(35, 55, 46, 1)',
      barren: 'rgba(36, 48, 51, 1)',
      urban_area: 'rgba(28, 37, 39, 1)',
      farmland: 'rgba(35, 55, 46, 1)',
      scrub: 'rgba(35, 55, 46, 1)',
      forest: 'rgba(35, 55, 46, 1)',
      glacier: 'rgba(26, 36, 44, 1)',
    },
    pois: {
      ...base.pois,
      turquoise: '#11ACA9',
      pink: '#D67680',
      blue: '#80A2D6',
      tangerine: '#E8BC3B',
      slategray: '#8A6AFF',
    },
  };
}

/**
 * MapLibre style for the owned PMTiles archive (same-origin assets only).
 * @param {{ tilesUrl?: string }} [opts]
 */
export function createOwnedBasemapStyle({
  tilesUrl = OWNED_PMTILES_PATH,
} = {}) {
  const sourceUrl = tilesUrl.startsWith('pmtiles://')
    ? tilesUrl
    : `pmtiles://${tilesUrl}`;
  return {
    version: 8,
    name: 'caelrion-owned-protomaps-dark',
    glyphs: '/assets/basemaps/fonts/{fontstack}/{range}.pbf',
    sprite: '/assets/basemaps/sprites/v4/dark',
    sources: {
      protomaps: {
        type: 'vector',
        url: sourceUrl,
        attribution:
          '© Protomaps · © OpenStreetMap contributors · Caelrion-hosted',
        maxzoom: 15,
      },
    },
    layers: applyProgressiveRoadDetail(
      layers('protomaps', createArgosDarkFlavor(), { lang: 'en' }),
    ),
  };
}

let _protocolRegistered = false;

/** Register the MapLibre `pmtiles://` protocol once per page. */
export function ensurePmtilesProtocol() {
  if (_protocolRegistered) return true;
  const protocol = new Protocol({ metadata: true });
  maplibregl.addProtocol('pmtiles', protocol.tile);
  _protocolRegistered = true;
  return true;
}

export function isPmtilesProtocolRegistered() {
  return _protocolRegistered;
}

/** @param {number} lon @param {number} lat */
export function isInCaliforniaDetailBounds(lon, lat) {
  const b = CALIFORNIA_DETAIL_BOUNDS;
  return lon >= b.west && lon <= b.east && lat >= b.south && lat <= b.north;
}

/**
 * @deprecated R28 — alias of isInCaliforniaDetailBounds.
 * @param {number} lon @param {number} lat
 */
export function isInSocalDetailBounds(lon, lat) {
  return isInCaliforniaDetailBounds(lon, lat);
}

/**
 * Coverage state for the owned archive (not a provider outage).
 * @returns {'ready'|'limited-coverage'}
 */
export function ownedCoverageState({ lon, lat, zoom }) {
  if (
    !Number.isFinite(lon) ||
    !Number.isFinite(lat) ||
    !Number.isFinite(zoom)
  ) {
    return 'ready';
  }
  if (zoom <= OWNED_GLOBAL_MAX_ZOOM) return 'ready';
  if (isInCaliforniaDetailBounds(lon, lat)) return 'ready';
  return 'limited-coverage';
}

export const OWNED_BASEMAP_LICENSE = Object.freeze({
  claim: 'Caelrion-hosted Protomaps v4 vector basemap (owned archive)',
  data_license: 'ODbL (OpenStreetMap contributors)',
  style_package: '@protomaps/basemaps',
  tile_runtime: 'pmtiles',
  glyphs_sprites: 'Self-hosted from protomaps/basemaps-assets (SIL OFL fonts)',
  not_used: [
    'Esri World Imagery (default 2D retired)',
    'MapTiler Hybrid',
    'ArcGIS Location Platform basemaps-api',
    'Keyless services.arcgisonline.com as default 2D',
    'Argos proprietary tiles',
  ],
  artifact: OWNED_BASEMAP_ARTIFACT,
});
