/**
 * Caelrion-owned Protomaps/PMTiles 2D basemap (R15).
 *
 * Default MapLibre presentation is same-origin PMTiles + self-hosted glyphs/sprites.
 * Does not use Esri World Imagery or MapTiler. Large archive is a deploy artifact —
 * not committed to git.
 */
import maplibregl from 'maplibre-gl';
import { Protocol } from 'pmtiles';
import { layers, namedFlavor } from '@protomaps/basemaps';

/** Huntington Beach, California default camera (MapLibre [lon, lat]). */
export const DEFAULT_MAP_CENTER = Object.freeze([-117.99833, 33.66028]);
export const DEFAULT_MAP_ZOOM = 11.5;

/** Southern California high-detail coverage (z8–z15). */
export const SOCAL_DETAIL_BOUNDS = Object.freeze({
  west: -121.5,
  south: 32.4,
  east: -114.0,
  north: 35.9,
});

/** Zooms above this outside SoCal report limited-coverage (not offline). */
export const OWNED_GLOBAL_MAX_ZOOM = 7;

/**
 * Immutable deploy artifact identity (bytes live outside git).
 * File: /assets/maps/<filename> on the static host.
 */
export const OWNED_BASEMAP_ARTIFACT = Object.freeze({
  id: 'caelrion-basemap-r01',
  filename: 'caelrion-basemap-r01-822f068466c7.pmtiles',
  sha256: '822f068466c79112046e1ccbc4e93c306110d208a535d746a19bc84aed729d55',
  bytes: 790349026,
  source_build: 'https://build.protomaps.com/20261118.pmtiles',
  source_etag: 'f80d23ebf8f97045b56ad0bc73b8ec76-521',
  source_osm_time: '2026-11-18T04:00:00Z',
  tile_schema: 'Protomaps basemap v4 / MVT',
  version_label: '4.15.2',
  zooms: {
    global: '0-7',
    socal_detail: '8-15',
  },
  socal_bbox: [-121.5, 32.4, -114.0, 35.9],
});

export const OWNED_PMTILES_PATH = `/assets/maps/${OWNED_BASEMAP_ARTIFACT.filename}`;

export const MAP_ATTRIBUTION_HTML_OWNED =
  '© <a href="https://protomaps.com" target="_blank" rel="noopener">Protomaps</a> · ' +
  '© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> contributors (ODbL) · ' +
  'Caelrion-hosted vector basemap';

/**
 * R16 corrected dark cartography — cool neutral land, blue water, green parks,
 * light neutral labels. Gold is reserved for UI accents, not place names.
 */
export function createArgosDarkFlavor() {
  const base = namedFlavor('dark');
  const halo = '#172027';
  return {
    ...base,
    background: '#171D23',
    earth: '#20272D',
    park_a: '#244238',
    park_b: '#244238',
    wood_a: '#23382F',
    wood_b: '#23382F',
    scrub_a: '#24362F',
    scrub_b: '#24362F',
    water: '#102D40',
    glacier: '#1a242c',
    sand: '#2a3036',
    beach: '#2e363c',
    hospital: '#262e34',
    industrial: '#242c32',
    school: '#262e34',
    pedestrian: '#20272D',
    aerodrome: '#20272D',
    runway: '#434F57',
    zoo: '#24362F',
    military: '#262e34',
    buildings: '#303A40',
    highway: '#82939E',
    major: '#697985',
    minor_a: '#434F57',
    minor_b: '#434F57',
    link: '#697985',
    other: '#434F57',
    minor_service: '#434F57',
    railway: '#2a3238',
    pier: '#434F57',
    tunnel_other: '#303A40',
    tunnel_minor: '#303A40',
    tunnel_link: '#303A40',
    tunnel_major: '#303A40',
    tunnel_highway: '#303A40',
    bridges_other: '#434F57',
    bridges_minor: '#434F57',
    bridges_link: '#697985',
    bridges_major: '#697985',
    bridges_highway: '#82939E',
    city_label: '#E5EBEF',
    city_label_halo: halo,
    subplace_label: '#B8C6CE',
    subplace_label_halo: halo,
    state_label: '#96A6AF',
    state_label_halo: halo,
    country_label: '#E5EBEF',
    ocean_label: '#80A2D6',
    roads_label_major: '#B8C6CE',
    roads_label_major_halo: halo,
    roads_label_minor: '#96A6AF',
    roads_label_minor_halo: halo,
    address_label: '#96A6AF',
    address_label_halo: halo,
    boundaries: '#5a6470',
    landcover: {
      ...(base.landcover || {}),
      grassland: 'rgba(36, 66, 56, 1)',
      barren: 'rgba(42, 48, 54, 1)',
      urban_area: 'rgba(32, 39, 45, 1)',
      farmland: 'rgba(40, 58, 48, 1)',
      scrub: 'rgba(36, 54, 47, 1)',
      forest: 'rgba(35, 56, 47, 1)',
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
    layers: layers('protomaps', createArgosDarkFlavor(), { lang: 'en' }),
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
export function isInSocalDetailBounds(lon, lat) {
  const b = SOCAL_DETAIL_BOUNDS;
  return lon >= b.west && lon <= b.east && lat >= b.south && lat <= b.north;
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
  if (isInSocalDetailBounds(lon, lat)) return 'ready';
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
