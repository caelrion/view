/**
 * DEMO aircraft fixture for Argos-baseline V02.
 *
 * Clearly marked DEMO — not a live feed claim. Position approximates a
 * mid-Atlantic corridor aircraft for visual marker/detail-card exercise.
 * Replace with a backend-authorized projection when BACKEND_CONTRACT is ready.
 */

export const DEMO_AIRCRAFT_FIXTURE = Object.freeze({
  id: 'ae07f6',
  lat: 40.4168,
  lon: -3.7038,
  headingDeg: 72,
  label: 'DEMO AE07F6',
  callsign: 'DEMO01',
  altitudeFt: 36000,
  groundSpeedKt: 450,
  provenance: 'DEMO',
  status: 'DEMO',
  statusNote:
    'DEMO fixture — not live ADS-B. BACKEND_CONTRACT_PENDING for Caelrion aircraft projection.',
});

export const BACKEND_CONTRACT_PENDING = Object.freeze({
  code: 'BACKEND_CONTRACT_PENDING',
  message:
    'No eligible Caelrion aircraft endpoint admitted for View 2D yet. Using DEMO fixture only.',
});
