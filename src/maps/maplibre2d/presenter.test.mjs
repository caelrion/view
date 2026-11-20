import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  MAP_LICENSE_MANIFEST,
  MAP_ATTRIBUTION_HTML,
  OPENFREEMAP_STYLE_URL,
  OPENFREEMAP_DARK_STYLE_URL,
  createOfflineDarkStyleStub,
} from './style.js';

test('P0: V1.1 Fiord style endpoint and attribution are declared', () => {
  assert.match(OPENFREEMAP_STYLE_URL, /openfreemap\.org\/styles\/fiord/);
  assert.match(OPENFREEMAP_DARK_STYLE_URL, /styles\/dark/);
  assert.match(MAP_ATTRIBUTION_HTML, /OpenMapTiles/);
  assert.match(MAP_ATTRIBUTION_HTML, /OpenFreeMap/);
  assert.match(MAP_ATTRIBUTION_HTML, /OpenStreetMap/);
  assert.ok(MAP_LICENSE_MANIFEST.style_design.claim.includes('Fiord'));
  assert.ok(MAP_LICENSE_MANIFEST.not_used.includes('Argos proprietary source'));
});

test('H2: offline stub style is a valid MapLibre style object', () => {
  const stub = createOfflineDarkStyleStub();
  assert.equal(stub.version, 8);
  assert.ok(Array.isArray(stub.layers));
  assert.equal(stub.layers[0].type, 'background');
});
