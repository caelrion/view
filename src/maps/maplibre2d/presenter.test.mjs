import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  MAP_LICENSE_MANIFEST,
  MAP_ATTRIBUTION_HTML,
  MAP_ATTRIBUTION_HTML_OWNED,
  OPENFREEMAP_STYLE_URL,
  DEFAULT_MAP_CENTER,
  DEFAULT_MAP_ZOOM,
  createOwnedBasemapStyle,
  createOfflineDarkStyleStub,
  OWNED_BASEMAP_ARTIFACT,
} from './style.js';

test('P0: R15 owned basemap style and LA defaults are declared', () => {
  const style = createOwnedBasemapStyle();
  assert.equal(style.sources.protomaps.type, 'vector');
  assert.match(style.sources.protomaps.url, /^pmtiles:\/\//);
  assert.match(OPENFREEMAP_STYLE_URL, /openfreemap\.org\/styles\/fiord/);
  assert.equal(MAP_ATTRIBUTION_HTML, MAP_ATTRIBUTION_HTML_OWNED);
  assert.match(MAP_ATTRIBUTION_HTML, /Protomaps/);
  assert.ok(MAP_LICENSE_MANIFEST.style_design.claim.includes('Protomaps'));
  assert.ok(
    MAP_LICENSE_MANIFEST.not_used.some((s) => /Esri World Imagery/i.test(s)),
  );
  assert.deepEqual([...DEFAULT_MAP_CENTER], [-118.2437, 34.0522]);
  assert.equal(DEFAULT_MAP_ZOOM, 10.5);
  assert.equal(OWNED_BASEMAP_ARTIFACT.bytes, 790349026);
});

test('H2: offline stub style is a valid MapLibre style object', () => {
  const stub = createOfflineDarkStyleStub();
  assert.equal(stub.version, 8);
  assert.ok(Array.isArray(stub.layers));
  assert.equal(stub.layers[0].type, 'background');
});

test('P0: setAircraft source documents no automatic camera move', async () => {
  const src = await import('node:fs').then((fs) =>
    fs.promises.readFile(new URL('./presenter.js', import.meta.url), 'utf8'),
  );
  assert.match(src, /moveCamera\s*=\s*false/);
  assert.match(src, /Loading DEMO aircraft must not move the camera/);
  assert.match(src, /createOwnedBasemapStyle/);
  assert.match(src, /ensurePmtilesProtocol/);
  assert.doesNotMatch(src, /createSatelliteHybridStyle/);
});
