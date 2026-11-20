import test from 'node:test';
import assert from 'node:assert/strict';
import {
  OPENFREEMAP_STYLE_URL,
  OPENFREEMAP_DARK_STYLE_URL,
  OPENFREEMAP_FIORD_STYLE_URL,
  MAP_ATTRIBUTION_HTML,
  createOfflineDarkStyleStub,
  MAP_LICENSE_MANIFEST,
  applyReadableDarkPaint,
  READABLE_DARK_PAINT_OVERRIDES,
  classifyMapError,
} from './style.js';

test('P0: V1.1 primary style is OpenFreeMap Fiord (readable dark)', () => {
  assert.equal(OPENFREEMAP_STYLE_URL, OPENFREEMAP_FIORD_STYLE_URL);
  assert.match(OPENFREEMAP_STYLE_URL, /openfreemap\.org\/styles\/fiord/);
  assert.match(OPENFREEMAP_DARK_STYLE_URL, /styles\/dark/);
  assert.match(MAP_ATTRIBUTION_HTML, /OpenMapTiles/);
  assert.match(MAP_ATTRIBUTION_HTML, /OpenFreeMap/);
  assert.match(MAP_ATTRIBUTION_HTML, /OpenStreetMap/);
  assert.ok(MAP_LICENSE_MANIFEST.not_used.includes('Argos proprietary source'));
  assert.ok(
    MAP_LICENSE_MANIFEST.not_used.includes(
      'Global CSS brightness filter as map substitute',
    ),
  );
});

test('P0: paint overrides skip missing layers and apply known ones', () => {
  const applied = [];
  const map = {
    getLayer(id) {
      return id === 'water' || id === 'background' ? {} : null;
    },
    setPaintProperty(id, prop, value) {
      applied.push([id, prop, value]);
    },
  };
  const count = applyReadableDarkPaint(map, READABLE_DARK_PAINT_OVERRIDES);
  assert.ok(count >= 2);
  assert.ok(applied.some(([id]) => id === 'water'));
  assert.ok(!applied.some(([id]) => id === 'place_city'));
});

test('P0: classifyMapError distinguishes tile vs style-fatal', () => {
  assert.equal(
    classifyMapError({ error: { message: 'Failed to fetch tile 3/2/1.pbf' } })
      .kind,
    'tile-or-glyph',
  );
  assert.equal(
    classifyMapError({ error: { message: 'Style parse failed', status: 200 } })
      .kind,
    'style-fatal',
  );
  assert.equal(
    classifyMapError({ error: { message: 'glyph range missing' } }).kind,
    'tile-or-glyph',
  );
});

test('H2: offline stub remains a usable MapLibre style object (slate)', () => {
  const stub = createOfflineDarkStyleStub();
  assert.equal(stub.version, 8);
  assert.ok(Array.isArray(stub.layers));
  assert.equal(stub.layers[0].type, 'background');
  assert.notEqual(stub.layers[0].paint['background-color'], '#000');
  assert.notEqual(stub.layers[0].paint['background-color'], '#0b0f14');
});
