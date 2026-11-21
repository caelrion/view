/**
 * R25 — Satellite 2D solar day/night presentation.
 *
 * Local browser math only (no CORE). Uses map-center WGS84 + UTC to decide
 * whether the *viewed region* is in daylight, twilight, or night.
 */

export const SATELLITE_RASTER_LAYER_IDS = Object.freeze([
  'gibs-blue-marble-raster',
  'eox-cloudless-raster',
  'naip-la-raster',
]);

/**
 * Nighttime ocean tint — Argos near-black navy
 * (`argos.png`, `SouthAmerica-Night.png`).
 */
export const SATELLITE_NIGHT_WATER_COLOR = '#050E18';

export const SATELLITE_NIGHT_WATER_LAYER_ID = 'satellite-night-water';

/** Civil twilight start (°). Above → day. */
export const SOLAR_DAY_ELEV_DEG = 0;
/** Soft twilight band start (°). */
export const SOLAR_CIVIL_ELEV_DEG = -6;
/** Full night (° nautical). */
export const SOLAR_NIGHT_ELEV_DEG = -12;

/**
 * R26 visual acceptance — night stays cooler/darker than day, but terrain and
 * urban photo structure must remain legible (Mario rejected brightness-max 0.26
 * crush). Water stays distinctly darker than land.
 */
export const NIGHT_RASTER_BRIGHTNESS_MIN = 0.0;
export const NIGHT_RASTER_BRIGHTNESS_MAX = 0.68;
export const NIGHT_RASTER_SATURATION = -0.42;
export const NIGHT_RASTER_CONTRAST = 0.1;
export const NIGHT_RASTER_HUE_ROTATE_DEG = 145;
export const NIGHT_WATER_TINT_OPACITY = 0.7;
/** Fraction of full night reached by end of civil twilight (−6°). */
export const CIVIL_TWILIGHT_NIGHT_FRACTION = 0.4;

const D2R = Math.PI / 180;
const R2D = 180 / Math.PI;

function clamp01(x) {
  return Math.max(0, Math.min(1, x));
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

/**
 * Solar elevation at a geographic point (degrees). UTC epoch only.
 * USNO low-precision Sun + GMST approximation — styling accuracy, not navigation.
 * @param {number} latDeg
 * @param {number} lonDeg
 * @param {number} [dateMs]
 * @returns {number}
 */
export function solarElevationDeg(latDeg, lonDeg, dateMs = Date.now()) {
  const lat = Number(latDeg);
  const lon = Number(lonDeg);
  const t = Number(dateMs);
  if (!Number.isFinite(lat) || !Number.isFinite(lon) || !Number.isFinite(t)) {
    return 0;
  }
  if (Math.abs(lat) > 90 || Math.abs(lon) > 180) return 0;

  const JD = t / 86400000 + 2440587.5;
  const D = JD - 2451545.0;
  const g = ((((357.529 + 0.98560028 * D) % 360) + 360) % 360) * D2R;
  const q = (((280.459 + 0.98564736 * D) % 360) + 360) % 360;
  const L =
    ((((q + 1.915 * Math.sin(g) + 0.02 * Math.sin(2 * g)) % 360) + 360) % 360) *
    D2R;
  const e = (23.439 - 0.00000036 * D) * D2R;
  const ra = Math.atan2(Math.cos(e) * Math.sin(L), Math.cos(L));
  const dec = Math.asin(Math.sin(e) * Math.sin(L));
  const raDeg = (((ra * R2D) % 360) + 360) % 360;
  const decDeg = dec * R2D;

  // Greenwich mean sidereal time (degrees).
  let gmst = 280.46061837 + 360.98564736629 * D;
  gmst = ((gmst % 360) + 360) % 360;
  const localHourAngleDeg = (((gmst + lon - raDeg) % 360) + 360) % 360;
  const H = localHourAngleDeg * D2R;
  const phi = lat * D2R;
  const delta = decDeg * D2R;
  const sinElev =
    Math.sin(phi) * Math.sin(delta) +
    Math.cos(phi) * Math.cos(delta) * Math.cos(H);
  return Math.asin(Math.max(-1, Math.min(1, sinElev))) * R2D;
}

/**
 * 0 = full daylight, 1 = full night. Smooth across civil → nautical twilight.
 * @param {number} elevDeg
 * @returns {number}
 */
export function nightFactorFromSolarElevation(elevDeg) {
  const e = Number(elevDeg);
  if (!Number.isFinite(e)) return 0;
  if (e >= SOLAR_DAY_ELEV_DEG) return 0;
  if (e <= SOLAR_NIGHT_ELEV_DEG) return 1;
  if (e >= SOLAR_CIVIL_ELEV_DEG) {
    // 0 → −6°: dusk builds quickly so day/night reads at a glance
    return (
      ((SOLAR_DAY_ELEV_DEG - e) / (SOLAR_DAY_ELEV_DEG - SOLAR_CIVIL_ELEV_DEG)) *
      CIVIL_TWILIGHT_NIGHT_FRACTION
    );
  }
  // −6° → −12°: deepen to full night
  const t =
    (SOLAR_CIVIL_ELEV_DEG - e) / (SOLAR_CIVIL_ELEV_DEG - SOLAR_NIGHT_ELEV_DEG);
  return (
    CIVIL_TWILIGHT_NIGHT_FRACTION + t * (1 - CIVIL_TWILIGHT_NIGHT_FRACTION)
  );
}

/**
 * MapLibre raster paint for a night factor (does not touch raster-opacity).
 * R02: dramatic blue-charcoal night vs natural day; land stays textured.
 * @param {number} nightFactor
 */
export function rasterPaintForNightFactor(nightFactor) {
  const f = clamp01(nightFactor);
  return {
    'raster-brightness-min': lerp(0, NIGHT_RASTER_BRIGHTNESS_MIN, f),
    'raster-brightness-max': lerp(1, NIGHT_RASTER_BRIGHTNESS_MAX, f),
    'raster-saturation': lerp(0, NIGHT_RASTER_SATURATION, f),
    'raster-contrast': lerp(0, NIGHT_RASTER_CONTRAST, f),
    // Cool shift toward Argos blue-charcoal without a global CSS filter.
    'raster-hue-rotate': lerp(0, NIGHT_RASTER_HUE_ROTATE_DEG, f),
  };
}

/**
 * Water fill opacity — aggressive vs land so ocean reads near-black navy.
 * @param {number} nightFactor
 */
export function waterTintOpacityForNightFactor(nightFactor) {
  return lerp(0, NIGHT_WATER_TINT_OPACITY, clamp01(nightFactor));
}

/**
 * Style layer inserted under road/label overlays.
 * @param {{ fillOpacity?: number }} [opts] initial opacity (R26 first-frame)
 * @returns {object}
 */
export function createSatelliteNightWaterLayer({ fillOpacity = 0 } = {}) {
  return {
    id: SATELLITE_NIGHT_WATER_LAYER_ID,
    type: 'fill',
    source: 'protomaps',
    'source-layer': 'water',
    layout: { visibility: 'visible' },
    paint: {
      'fill-color': SATELLITE_NIGHT_WATER_COLOR,
      'fill-opacity': clamp01(Number(fillOpacity) || 0),
      'fill-antialias': true,
    },
  };
}

/**
 * Apply day/night paint to a loaded Satellite MapLibre map (no style reload).
 * @param {import('maplibre-gl').Map | null | undefined} map
 * @param {number} nightFactor
 */
export function applySatelliteDayNightPaint(map, nightFactor) {
  if (!map || typeof map.getLayer !== 'function') return;
  const f = clamp01(Number(nightFactor) || 0);
  const raster = rasterPaintForNightFactor(f);
  for (const id of SATELLITE_RASTER_LAYER_IDS) {
    if (!map.getLayer(id)) continue;
    for (const [prop, value] of Object.entries(raster)) {
      try {
        map.setPaintProperty(id, prop, value);
      } catch {
        /* layer may lack the paint property in older styles */
      }
    }
  }
  if (map.getLayer(SATELLITE_NIGHT_WATER_LAYER_ID)) {
    try {
      map.setPaintProperty(
        SATELLITE_NIGHT_WATER_LAYER_ID,
        'fill-opacity',
        waterTintOpacityForNightFactor(f),
      );
    } catch {
      /* ignore */
    }
  }
}

/**
 * Compute night factor for map center at UTC now (or injected clock).
 * @param {{ lat: number, lon: number, nowMs?: number }} input
 */
export function nightFactorForMapCenter({ lat, lon, nowMs = Date.now() }) {
  return nightFactorFromSolarElevation(solarElevationDeg(lat, lon, nowMs));
}
