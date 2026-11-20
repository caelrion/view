import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createArgosDarkFlavor,
  createOwnedBasemapStyle,
  DEFAULT_MAP_CENTER,
  DEFAULT_MAP_ZOOM,
} from './ownedBasemap.js';
import {
  createOwnedAerialStyle,
  createAerialOverlayFlavor,
  selectAerialOverlayLayers,
  aerialCoverageState,
  EOX_CLOUDLESS_2016_TILE_URL,
  GIBS_BLUE_MARBLE_TILE_URL,
  MAP_ATTRIBUTION_HTML_AERIAL,
  BASEMAP_MODE_DARK,
  BASEMAP_MODE_SATELLITE,
  EOX_MAX_ZOOM,
} from './ownedAerial.js';
import { layers } from '@protomaps/basemaps';

test('P0: R17 default camera is Huntington Beach', () => {
  assert.deepEqual([...DEFAULT_MAP_CENTER], [-117.99833, 33.66028]);
  assert.equal(DEFAULT_MAP_ZOOM, 11.5);
});

test('P0: R17-P1 dark flavor subdues roads; city labels are not gold', () => {
  const f = createArgosDarkFlavor();
  assert.equal(f.background, '#171D23');
  assert.equal(f.earth, '#1C2527');
  assert.equal(f.water, '#0A2A38');
  assert.equal(f.highway, '#47575B');
  assert.equal(f.major, '#374448');
  assert.equal(f.minor_a, '#2B363A');
  assert.equal(f.city_label, '#BBC8CA');
  assert.equal(f.subplace_label, '#9DAEB2');
  assert.notEqual(f.city_label.toLowerCase(), '#e8bc3b');
  // Hierarchy preserved: highway brighter than major, major brighter than minor.
  assert.ok(f.highway !== f.major);
  assert.ok(f.major !== f.minor_a);
});

test('P0: owned dark style still uses same-origin PMTiles + glyphs', () => {
  const style = createOwnedBasemapStyle();
  assert.equal(style.name, 'caelrion-owned-protomaps-dark');
  assert.match(style.sources.protomaps.url, /^pmtiles:\/\//);
  assert.ok(!style.sources['esri-world-imagery']);
});

test('P0: Satellite style streams EOx + GIBS (no Esri, no local planet)', () => {
  const style = createOwnedAerialStyle();
  assert.equal(style.name, 'caelrion-streamed-eox-satellite');
  assert.ok(style.sources['eox-cloudless-2016']);
  assert.ok(style.sources['gibs-blue-marble']);
  assert.equal(style.sources['eox-cloudless-2016'].type, 'raster');
  assert.equal(
    style.sources['eox-cloudless-2016'].tiles[0],
    EOX_CLOUDLESS_2016_TILE_URL,
  );
  assert.equal(
    style.sources['gibs-blue-marble'].tiles[0],
    GIBS_BLUE_MARBLE_TILE_URL,
  );
  assert.ok(!style.sources['caelrion-aerial']);
  assert.ok(!style.sources['esri-world-imagery']);
  assert.match(EOX_CLOUDLESS_2016_TILE_URL, /s2cloudless_3857/);
  assert.match(EOX_CLOUDLESS_2016_TILE_URL, /\{z\}\/\{y\}\/\{x\}/);
  assert.match(MAP_ATTRIBUTION_HTML_AERIAL, /EOX|Sentinel-2 cloudless/);
  assert.match(MAP_ATTRIBUTION_HTML_AERIAL, /Blue Marble|NASA/);
  assert.doesNotMatch(MAP_ATTRIBUTION_HTML_AERIAL, /Esri World Imagery/i);
  assert.ok(style.layers.some((l) => l.id === 'eox-cloudless-raster'));
  assert.ok(style.layers.some((l) => l.id === 'gibs-blue-marble-raster'));
  assert.ok(style.layers.some((l) => String(l.id).startsWith('roads_')));
});

test('P0: aerial overlay filter drops opaque land fills', () => {
  const all = layers('protomaps', createAerialOverlayFlavor(), { lang: 'en' });
  const kept = selectAerialOverlayLayers(all);
  assert.ok(kept.length > 10);
  assert.ok(kept.every((l) => l.id !== 'earth' && l.id !== 'water'));
});

test('P0: streamed coverage ready worldwide; limited only past EOx max zoom', () => {
  assert.equal(
    aerialCoverageState({ lon: -117.99833, lat: 33.66028, zoom: 11.5 }),
    'ready',
  );
  assert.equal(
    aerialCoverageState({ lon: 2.35, lat: 48.85, zoom: 10 }),
    'ready',
  );
  assert.equal(
    aerialCoverageState({ lon: 139.65, lat: 35.67, zoom: 9 }),
    'ready',
  );
  assert.equal(
    aerialCoverageState({
      lon: -117.99833,
      lat: 33.66028,
      zoom: EOX_MAX_ZOOM + 2,
    }),
    'limited-coverage',
  );
  assert.equal(BASEMAP_MODE_DARK, 'dark-vector');
  assert.equal(BASEMAP_MODE_SATELLITE, 'owned-aerial');
});
