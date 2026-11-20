import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  LOCAL_PLACE_PRESETS,
  parseLatLonQuery,
  searchLocal,
} from './localSearch.js';
import { DEMO_AIRCRAFT_FIXTURE } from '../../presentation/demoAircraftFixture.js';

test('parseLatLonQuery accepts lat,lon pairs and rejects out of range', () => {
  assert.deepEqual(parseLatLonQuery('40.4, -3.7'), { lat: 40.4, lon: -3.7 });
  assert.deepEqual(parseLatLonQuery('51.5  -0.12'), { lat: 51.5, lon: -0.12 });
  assert.equal(parseLatLonQuery('91,0'), null);
  assert.equal(parseLatLonQuery('Madrid'), null);
});

test('searchLocal resolves presets, DEMO aircraft, and honest empty', () => {
  const madrid = searchLocal({ query: 'madr' });
  assert.ok(madrid.results.some((r) => r.label === 'Madrid'));
  assert.ok(LOCAL_PLACE_PRESETS.length >= 5);

  const demo = searchLocal({
    query: 'ae07f6',
    aircraft: DEMO_AIRCRAFT_FIXTURE,
  });
  assert.equal(demo.results[0]?.kind, 'aircraft');
  assert.equal(demo.results[0]?.aircraftId, 'ae07f6');

  const callsign = searchLocal({
    query: 'DEMO01',
    aircraft: DEMO_AIRCRAFT_FIXTURE,
  });
  assert.equal(callsign.results[0]?.kind, 'aircraft');

  const miss = searchLocal({ query: 'zzzz-not-a-place' });
  assert.equal(miss.results.length, 0);
  assert.equal(miss.emptyMessage, 'No locally available result');
});

test('searchLocal can use already-loaded MapLibre point features', () => {
  const map = {
    getStyle: () => ({ layers: [{ id: 'place-label', type: 'symbol' }] }),
    queryRenderedFeatures: () => [
      {
        properties: { name: 'Seville' },
        geometry: { type: 'Point', coordinates: [-5.9845, 37.3891] },
      },
    ],
  };
  const hit = searchLocal({ query: 'sevil', map });
  assert.equal(hit.results[0]?.kind, 'map-feature');
  assert.equal(hit.results[0]?.label, 'Seville');
});
