import test from 'node:test';
import assert from 'node:assert/strict';
import {
  OPENFREEMAP_STYLE_URL,
  OPENFREEMAP_DARK_STYLE_URL,
  OPENFREEMAP_FIORD_STYLE_URL,
  MAP_ATTRIBUTION_HTML,
  MAP_ATTRIBUTION_HTML_OWNED,
  MAP_ATTRIBUTION_HTML_FIORD,
  DEFAULT_MAP_CENTER,
  DEFAULT_MAP_ZOOM,
  createOwnedBasemapStyle,
  createOfflineDarkStyleStub,
  MAP_LICENSE_MANIFEST,
  OWNED_BASEMAP_ARTIFACT,
  OWNED_PMTILES_PATH,
  applyReadableDarkPaint,
  READABLE_DARK_PAINT_OVERRIDES,
  classifyMapError,
  ownedCoverageState,
} from './style.js';

test('P0: R15/R16 primary dark style is owned Protomaps/PMTiles (no Esri default)', () => {
  const style = createOwnedBasemapStyle();
  assert.equal(style.version, 8);
  assert.equal(style.name, 'caelrion-owned-protomaps-dark');
  assert.ok(style.sources.protomaps);
  assert.match(style.sources.protomaps.url, /^pmtiles:\/\//);
  assert.match(style.sources.protomaps.url, /caelrion-basemap-r01/);
  assert.match(style.glyphs, /^\/assets\/basemaps\/fonts\//);
  assert.match(style.sprite, /^\/assets\/basemaps\/sprites\/v4\/dark/);
  assert.ok(Array.isArray(style.layers));
  assert.ok(style.layers.length > 20);
  assert.ok(!style.sources['esri-world-imagery']);
  assert.equal(
    OWNED_PMTILES_PATH,
    `/assets/maps/${OWNED_BASEMAP_ARTIFACT.filename}`,
  );
  assert.match(OWNED_BASEMAP_ARTIFACT.sha256, /^[a-f0-9]{64}$/);
  // R16: style JSON must not hard-code gold city labels into layer paint via flavor.
  const city = style.layers.find((l) => l.id === 'places_locality');
  if (city?.paint?.['text-color']) {
    assert.notEqual(city.paint['text-color'], '#E8BC3B');
  }
});

test('P0: default camera is Los Angeles (lon, lat) at zoom 10.5', () => {
  assert.deepEqual([...DEFAULT_MAP_CENTER], [-118.2437, 34.0522]);
  assert.equal(DEFAULT_MAP_ZOOM, 10.5);
});

test('P0: owned attribution names Protomaps/OSM; Fiord retained for recovery', () => {
  assert.equal(MAP_ATTRIBUTION_HTML, MAP_ATTRIBUTION_HTML_OWNED);
  assert.match(MAP_ATTRIBUTION_HTML_OWNED, /Protomaps/);
  assert.match(MAP_ATTRIBUTION_HTML_OWNED, /OpenStreetMap/);
  assert.match(MAP_ATTRIBUTION_HTML_FIORD, /OpenFreeMap|Fiord/);
  assert.ok(MAP_LICENSE_MANIFEST.style_design.claim.includes('Protomaps'));
  assert.ok(
    MAP_LICENSE_MANIFEST.not_used.some((s) => /Esri World Imagery/i.test(s)),
  );
  assert.equal(OPENFREEMAP_STYLE_URL, OPENFREEMAP_FIORD_STYLE_URL);
  assert.match(OPENFREEMAP_DARK_STYLE_URL, /styles\/dark/);
});

test('P0: ownedCoverageState distinguishes ready vs limited-coverage', () => {
  assert.equal(
    ownedCoverageState({ lon: -118.24, lat: 34.05, zoom: 10.5 }),
    'ready',
  );
  assert.equal(
    ownedCoverageState({ lon: -118.24, lat: 34.05, zoom: 5 }),
    'ready',
  );
  assert.equal(
    ownedCoverageState({ lon: -74.0, lat: 40.7, zoom: 12 }),
    'limited-coverage',
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
});

test('P0: classifyMapError distinguishes tile and style-fatal', () => {
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
    classifyMapError({
      error: { message: 'Style is not done loading' },
    }).kind,
    'unknown',
  );
});

test('H2: offline stub remains a usable MapLibre style object (slate)', () => {
  const stub = createOfflineDarkStyleStub();
  assert.equal(stub.version, 8);
  assert.ok(Array.isArray(stub.layers));
  assert.equal(stub.layers[0].type, 'background');
  assert.notEqual(stub.layers[0].paint['background-color'], '#000');
});
