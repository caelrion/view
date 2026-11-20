import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  MAP_LICENSE_MANIFEST,
  MAP_ATTRIBUTION_HTML,
  OPENFREEMAP_DARK_STYLE_URL,
  createOfflineDarkStyleStub,
} from './style.js';

test('P1: licensed dark style endpoint and attribution are declared', () => {
  assert.match(OPENFREEMAP_DARK_STYLE_URL, /openfreemap\.org\/styles\/dark/);
  assert.match(MAP_ATTRIBUTION_HTML, /CARTO/);
  assert.match(MAP_ATTRIBUTION_HTML, /OpenFreeMap/);
  assert.match(MAP_ATTRIBUTION_HTML, /OpenStreetMap/);
  assert.equal(MAP_LICENSE_MANIFEST.style_design.license, 'CC BY 4.0');
  assert.ok(MAP_LICENSE_MANIFEST.not_used.includes('Argos proprietary source'));
});

test('H2: offline stub style is a valid MapLibre style object', () => {
  const stub = createOfflineDarkStyleStub();
  assert.equal(stub.version, 8);
  assert.ok(Array.isArray(stub.layers));
  assert.equal(stub.layers[0].type, 'background');
});
