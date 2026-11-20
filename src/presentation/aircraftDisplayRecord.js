/**
 * Pure aircraft display adapter for the Argos-standard 2D map.
 *
 * Accepts an already-authorized projection or DEMO fixture. Performs no
 * network I/O, polling, credential use, or domain computation.
 */

const HEX = /^[0-9a-f]{6}$/i;

/**
 * @typedef {object} AircraftDisplayRecord
 * @property {string} id
 * @property {number} lat
 * @property {number} lon
 * @property {number|null} headingDeg
 * @property {string|null} label
 * @property {string|null} callsign
 * @property {number|null} altitudeFt
 * @property {number|null} groundSpeedKt
 * @property {'DEMO'|'BACKEND'|'INCUMBENT'} provenance
 * @property {'DEMO'|'LIVE'|'STALE'|'UNKNOWN'|'BACKEND_CONTRACT_PENDING'} status
 * @property {string|null} statusNote
 */

/**
 * @param {unknown} raw
 * @returns {AircraftDisplayRecord}
 */
export function toAircraftDisplayRecord(raw) {
  if (!raw || typeof raw !== 'object') {
    throw new TypeError('AIRCRAFT_DISPLAY_RECORD_REQUIRED');
  }
  const id = String(raw.id || raw.icao24 || '').trim().toLowerCase();
  if (!id || id.length > 32) throw new TypeError('AIRCRAFT_ID_INVALID');
  if (HEX.test(id) === false && !/^[a-z0-9_-]{1,32}$/i.test(id)) {
    throw new TypeError('AIRCRAFT_ID_INVALID');
  }

  const lat = Number(raw.lat ?? raw.latitude);
  const lon = Number(raw.lon ?? raw.longitude);
  if (!Number.isFinite(lat) || lat < -90 || lat > 90) {
    throw new TypeError('AIRCRAFT_LAT_INVALID');
  }
  if (!Number.isFinite(lon) || lon < -180 || lon > 180) {
    throw new TypeError('AIRCRAFT_LON_INVALID');
  }

  const headingRaw = raw.headingDeg ?? raw.heading ?? raw.track;
  const headingDeg =
    headingRaw === null || headingRaw === undefined || headingRaw === ''
      ? null
      : Number(headingRaw);
  if (headingDeg !== null && !Number.isFinite(headingDeg)) {
    throw new TypeError('AIRCRAFT_HEADING_INVALID');
  }

  const provenance = String(raw.provenance || 'UNKNOWN').toUpperCase();
  if (!['DEMO', 'BACKEND', 'INCUMBENT'].includes(provenance)) {
    throw new TypeError('AIRCRAFT_PROVENANCE_INVALID');
  }

  let status = String(raw.status || 'UNKNOWN').toUpperCase();
  if (
    ![
      'DEMO',
      'LIVE',
      'STALE',
      'UNKNOWN',
      'BACKEND_CONTRACT_PENDING',
    ].includes(status)
  ) {
    throw new TypeError('AIRCRAFT_STATUS_INVALID');
  }
  // Never upgrade DEMO or missing-backend into LIVE claims.
  if (status === 'LIVE' && provenance === 'DEMO') {
    throw new TypeError('AIRCRAFT_LIVE_CLAIM_FORBIDDEN_FOR_DEMO');
  }
  if (provenance === 'DEMO' && status !== 'DEMO') status = 'DEMO';

  const altitudeFt = optionalFinite(raw.altitudeFt ?? raw.baro_altitude_ft);
  const groundSpeedKt = optionalFinite(raw.groundSpeedKt ?? raw.velocity_kt);

  return Object.freeze({
    id,
    lat,
    lon,
    headingDeg:
      headingDeg === null ? null : ((headingDeg % 360) + 360) % 360,
    label: optionalString(raw.label),
    callsign: optionalString(raw.callsign),
    altitudeFt,
    groundSpeedKt,
    provenance,
    status,
    statusNote: optionalString(raw.statusNote),
  });
}

function optionalFinite(value) {
  if (value === null || value === undefined || value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function optionalString(value) {
  if (value === null || value === undefined) return null;
  const text = String(value).trim();
  return text ? text.slice(0, 64) : null;
}
