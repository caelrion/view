/**
 * R22 — Browser device location for View Home / startup.
 *
 * One-shot getCurrentPosition only (no watchers). Coordinates stay in-memory
 * for the session and are never persisted or sent to CORE.
 */

/** Shared Dark/Satellite local zoom (neighborhood/city). Matches DEFAULT_MAP_ZOOM. */
export const SHARED_2D_LOCAL_ZOOM = 11.5;

/**
 * Whole-Earth Cesium camera height (meters).
 * One zoom-factor step closer than the prior 18e6 framing so the globe fills
 * the viewport without leaving street/city scale.
 */
export const CESIUM_GLOBE_HEIGHT_M = 12_000_000;

/** Regional Cesium camera height (meters). */
export const CESIUM_REGION_HEIGHT_M = 850_000;

/** City/local Cesium camera height (meters) — comparable to SHARED_2D_LOCAL_ZOOM. */
export const CESIUM_CITY_HEIGHT_M = 14_000;

/**
 * @param {unknown} lon
 * @param {unknown} lat
 * @returns {boolean}
 */
export function isValidWgs84(lon, lat) {
  const x = Number(lon);
  const y = Number(lat);
  return (
    Number.isFinite(x) &&
    Number.isFinite(y) &&
    Math.abs(x) <= 180 &&
    Math.abs(y) <= 90
  );
}

/**
 * @param {{
 *   geolocation?: Geolocation | null,
 *   timeoutMs?: number,
 *   maximumAgeMs?: number,
 * }} [options]
 * @returns {Promise<{ ok: true, lon: number, lat: number, accuracy?: number } | { ok: false, reason: string }>}
 */
export function requestDeviceLocation({
  geolocation = typeof navigator !== 'undefined' ? navigator.geolocation : null,
  timeoutMs = 10_000,
  maximumAgeMs = 60_000,
} = {}) {
  if (!geolocation || typeof geolocation.getCurrentPosition !== 'function') {
    return Promise.resolve({ ok: false, reason: 'unavailable' });
  }
  return new Promise((resolve) => {
    try {
      geolocation.getCurrentPosition(
        (pos) => {
          const lon = Number(pos?.coords?.longitude);
          const lat = Number(pos?.coords?.latitude);
          if (!isValidWgs84(lon, lat)) {
            resolve({ ok: false, reason: 'invalid' });
            return;
          }
          resolve({
            ok: true,
            lon,
            lat,
            accuracy: Number(pos?.coords?.accuracy),
          });
        },
        (err) => {
          const code = Number(err?.code);
          if (code === 1) resolve({ ok: false, reason: 'denied' });
          else if (code === 3) resolve({ ok: false, reason: 'timeout' });
          else resolve({ ok: false, reason: 'unavailable' });
        },
        {
          enableHighAccuracy: false,
          timeout: timeoutMs,
          maximumAge: maximumAgeMs,
        },
      );
    } catch {
      resolve({ ok: false, reason: 'unavailable' });
    }
  });
}

/**
 * Human-facing status for Home / startup (presentation only).
 * @param {string} reason
 */
export function locationFailureMessage(reason) {
  switch (reason) {
    case 'denied':
      return 'Location permission denied';
    case 'timeout':
      return 'Location request timed out';
    case 'invalid':
      return 'Location coordinates were invalid';
    default:
      return 'Location unavailable';
  }
}
