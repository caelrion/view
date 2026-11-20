import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  MAP_LICENSE_MANIFEST,
  MAP_ATTRIBUTION_HTML,
  MAP_ATTRIBUTION_HTML_SATELLITE,
  OPENFREEMAP_STYLE_URL,
  OPENFREEMAP_DARK_STYLE_URL,
  DEFAULT_MAP_CENTER,
  DEFAULT_MAP_ZOOM,
  createSatelliteHybridStyle,
  createOfflineDarkStyleStub,
} from './style.js';

test('P0: V1.2 satellite-hybrid style and LA defaults are declared', () => {
  const hybrid = createSatelliteHybridStyle();
  assert.equal(hybrid.sources['esri-world-imagery'].type, 'raster');
  assert.match(OPENFREEMAP_STYLE_URL, /openfreemap\.org\/styles\/fiord/);
  assert.match(OPENFREEMAP_DARK_STYLE_URL, /styles\/dark/);
  assert.equal(MAP_ATTRIBUTION_HTML, MAP_ATTRIBUTION_HTML_SATELLITE);
  assert.match(MAP_ATTRIBUTION_HTML, /Esri/);
  assert.ok(MAP_LICENSE_MANIFEST.style_design.claim.includes('Esri'));
  assert.ok(MAP_LICENSE_MANIFEST.not_used.includes('Argos proprietary source'));
  assert.deepEqual([...DEFAULT_MAP_CENTER], [-118.2437, 34.0522]);
  assert.equal(DEFAULT_MAP_ZOOM, 10.5);
});

test('H2: offline stub style is a valid MapLibre style object', () => {
  const stub = createOfflineDarkStyleStub();
  assert.equal(stub.version, 8);
  assert.ok(Array.isArray(stub.layers));
  assert.equal(stub.layers[0].type, 'background');
});

test('P0: setAircraft source documents no automatic camera move', async () => {
  // Source-level contract: presenter.setAircraft(record) defaults moveCamera=false.
  // Full MapLibre mount is covered by browser QA; this pins the public signature.
  const src = await import('node:fs').then((fs) =>
    fs.promises.readFile(
      new URL('./presenter.js', import.meta.url),
      'utf8',
    ),
  );
  assert.match(src, /moveCamera\s*=\s*false/);
  assert.match(src, /Loading DEMO aircraft must not move the camera/);
  assert.doesNotMatch(
    src,
    /setAircraft\(record\)\s*\{[^}]*easeTo/s,
  );
});
