import test from 'node:test';
import assert from 'node:assert/strict';
import {
  OPENFREEMAP_STYLE_URL,
  OPENFREEMAP_DARK_STYLE_URL,
  OPENFREEMAP_FIORD_STYLE_URL,
  MAP_ATTRIBUTION_HTML,
  MAP_ATTRIBUTION_HTML_SATELLITE,
  MAP_ATTRIBUTION_HTML_FIORD,
  DEFAULT_MAP_CENTER,
  DEFAULT_MAP_ZOOM,
  ESRI_WORLD_IMAGERY_TILE_URL,
  createSatelliteHybridStyle,
  createOfflineDarkStyleStub,
  MAP_LICENSE_MANIFEST,
  applyReadableDarkPaint,
  READABLE_DARK_PAINT_OVERRIDES,
  classifyMapError,
} from './style.js';

test('P0: V1.2 primary style is Esri satellite-hybrid with Fiord fallback URL', () => {
  const hybrid = createSatelliteHybridStyle();
  assert.equal(hybrid.version, 8);
  assert.equal(hybrid.name, 'caelrion-esri-satellite-hybrid');
  assert.ok(hybrid.sources['esri-world-imagery']);
  assert.equal(
    hybrid.sources['esri-world-imagery'].tiles[0],
    ESRI_WORLD_IMAGERY_TILE_URL,
  );
  assert.match(ESRI_WORLD_IMAGERY_TILE_URL, /arcgisonline\.com.*World_Imagery/);
  assert.ok(hybrid.sources.openmaptiles);
  assert.ok(hybrid.layers.some((l) => l.id === 'satellite'));
  assert.ok(hybrid.layers.some((l) => l.id === 'place_city'));
  assert.equal(OPENFREEMAP_STYLE_URL, OPENFREEMAP_FIORD_STYLE_URL);
  assert.match(OPENFREEMAP_STYLE_URL, /openfreemap\.org\/styles\/fiord/);
  assert.match(OPENFREEMAP_DARK_STYLE_URL, /styles\/dark/);
});

test('P0: default camera is Los Angeles (lon, lat) at zoom 10.5', () => {
  assert.deepEqual([...DEFAULT_MAP_CENTER], [-118.2437, 34.0522]);
  assert.equal(DEFAULT_MAP_ZOOM, 10.5);
});

test('P0: satellite attribution names Esri; Fiord attribution retained for fallback', () => {
  assert.match(MAP_ATTRIBUTION_HTML_SATELLITE, /Esri/);
  assert.match(MAP_ATTRIBUTION_HTML_SATELLITE, /OpenMapTiles|OpenStreetMap/);
  assert.match(MAP_ATTRIBUTION_HTML_FIORD, /OpenFreeMap|Fiord/);
  assert.equal(MAP_ATTRIBUTION_HTML, MAP_ATTRIBUTION_HTML_SATELLITE);
  assert.ok(MAP_LICENSE_MANIFEST.style_design.claim.includes('Esri'));
  assert.ok(MAP_LICENSE_MANIFEST.imagery.provider === 'Esri');
  assert.ok(MAP_LICENSE_MANIFEST.not_used.includes('Argos proprietary source'));
  assert.ok(
    MAP_LICENSE_MANIFEST.not_used.includes(
      'Global CSS brightness filter as map substitute',
    ),
  );
  assert.ok(
    MAP_LICENSE_MANIFEST.not_used.some((s) => /MapTiler Hybrid/i.test(s)),
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

test('P0: classifyMapError distinguishes tile, imagery, and style-fatal', () => {
  assert.equal(
    classifyMapError({ error: { message: 'Failed to fetch tile 3/2/1.pbf' } })
      .kind,
    'tile-or-glyph',
  );
  assert.equal(
    classifyMapError({
      sourceId: 'esri-world-imagery',
      error: { message: 'Failed to fetch', status: 503 },
    }).kind,
    'imagery-tile',
  );
  assert.equal(
    classifyMapError({ error: { message: 'Style parse failed', status: 200 } })
      .kind,
    'style-fatal',
  );
  assert.equal(
    classifyMapError({ error: { message: 'failed to load style JSON' } }).kind,
    'style-fatal',
  );
  assert.equal(
    classifyMapError({
      error: { message: 'Style is not done loading' },
    }).kind,
    'unknown',
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
