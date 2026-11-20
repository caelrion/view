import assert from 'node:assert/strict';
import { test } from 'node:test';
import { toAircraftDisplayRecord } from './aircraftDisplayRecord.js';
import { DEMO_AIRCRAFT_FIXTURE } from './demoAircraftFixture.js';

test('P2: demo fixture becomes a selectable display record', () => {
  const record = toAircraftDisplayRecord(DEMO_AIRCRAFT_FIXTURE);
  assert.equal(record.id, 'ae07f6');
  assert.equal(record.status, 'DEMO');
  assert.equal(record.provenance, 'DEMO');
  assert.ok(Number.isFinite(record.lat));
  assert.ok(Number.isFinite(record.lon));
});

test('H1: invalid coordinates fail closed', () => {
  assert.throws(
    () => toAircraftDisplayRecord({ ...DEMO_AIRCRAFT_FIXTURE, lat: 200 }),
    /AIRCRAFT_LAT_INVALID/,
  );
  assert.throws(
    () => toAircraftDisplayRecord({ ...DEMO_AIRCRAFT_FIXTURE, id: '' }),
    /AIRCRAFT_ID_INVALID/,
  );
});

test('H1: DEMO cannot claim LIVE', () => {
  assert.throws(
    () =>
      toAircraftDisplayRecord({
        ...DEMO_AIRCRAFT_FIXTURE,
        status: 'LIVE',
      }),
    /AIRCRAFT_LIVE_CLAIM_FORBIDDEN_FOR_DEMO/,
  );
});

test('H3: missing backend stays DEMO / pending, not invented LIVE', () => {
  const record = toAircraftDisplayRecord({
    id: 'abc123',
    lat: 1,
    lon: 2,
    provenance: 'DEMO',
    status: 'BACKEND_CONTRACT_PENDING',
  });
  assert.equal(record.status, 'DEMO');
  assert.notEqual(record.status, 'LIVE');
});
