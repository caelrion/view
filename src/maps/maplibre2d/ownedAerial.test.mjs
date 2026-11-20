import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createArgosDarkFlavor,
  createOwnedBasemapStyle,
} from './ownedBasemap.js';
import {
  createOwnedAerialStyle,
  createAerialOverlayFlavor,
  selectAerialOverlayLayers,
  aerialCoverageState,
  isInAerialCoverage,
  AERIAL_COVERAGE_BOUNDS,
  OWNED_AERIAL_ARTIFACT,
  OWNED_AERIAL_PMTILES_PATH,
  MAP_ATTRIBUTION_HTML_AERIAL,
  BASEMAP_MODE_DARK,
  BASEMAP_MODE_SATELLITE,
} from './ownedAerial.js';
import { layers } from '@protomaps/basemaps';

test('P0: R16 dark flavor is cool-neutral; city labels are not gold', () => {
  const f = createArgosDarkFlavor();
  assert.equal(f.background, '#171D23');
  assert.equal(f.earth, '#20272D');
  assert.equal(f.water, '#102D40');
  assert.equal(f.buildings, '#303A40');
  assert.equal(f.highway, '#82939E');
  assert.equal(f.city_label, '#E5EBEF');
  assert.equal(f.subplace_label, '#B8C6CE');
  assert.notEqual(f.city_label.toLowerCase(), '#e8bc3b');
  assert.equal(f.city_label_halo, '#172027');
});

test('P0: owned dark style still uses same-origin PMTiles + glyphs', () => {
  const style = createOwnedBasemapStyle();
  assert.equal(style.name, 'caelrion-owned-protomaps-dark');
  assert.match(style.sources.protomaps.url, /^pmtiles:\/\//);
  assert.ok(!style.sources['esri-world-imagery']);
});

test('P0: aerial style has raster + vector sources and overlay-only layers', () => {
  const style = createOwnedAerialStyle();
  assert.equal(style.name, 'caelrion-owned-naip-aerial');
  assert.ok(style.sources['caelrion-aerial']);
  assert.equal(style.sources['caelrion-aerial'].type, 'raster');
  assert.match(style.sources['caelrion-aerial'].url, /^pmtiles:\/\//);
  assert.ok(style.sources.protomaps);
  assert.ok(style.layers.some((l) => l.id === 'caelrion-aerial-raster'));
  assert.ok(!style.layers.some((l) => l.id === 'earth'));
  assert.ok(!style.layers.some((l) => l.id === 'landcover'));
  assert.ok(!style.layers.some((l) => l.id === 'buildings'));
  assert.ok(style.layers.some((l) => String(l.id).startsWith('roads_')));
  assert.ok(style.layers.some((l) => String(l.id).startsWith('places_')));
  assert.match(MAP_ATTRIBUTION_HTML_AERIAL, /NAIP/);
  assert.doesNotMatch(MAP_ATTRIBUTION_HTML_AERIAL, /Esri World Imagery/i);
});

test('P0: aerial overlay filter drops opaque land fills', () => {
  const all = layers('protomaps', createAerialOverlayFlavor(), { lang: 'en' });
  const kept = selectAerialOverlayLayers(all);
  assert.ok(kept.length > 10);
  assert.ok(kept.every((l) => l.id !== 'earth' && l.id !== 'water'));
});

test('P0: aerial coverage distinguishes LA vs outside', () => {
  assert.equal(
    aerialCoverageState({ lon: -118.24, lat: 34.05, zoom: 10.5 }),
    'ready',
  );
  assert.equal(
    aerialCoverageState({ lon: -74.0, lat: 40.7, zoom: 12 }),
    'limited-coverage',
  );
  assert.equal(isInAerialCoverage(-118.24, 34.05), true);
  assert.deepEqual(
    [
      AERIAL_COVERAGE_BOUNDS.west,
      AERIAL_COVERAGE_BOUNDS.south,
      AERIAL_COVERAGE_BOUNDS.east,
      AERIAL_COVERAGE_BOUNDS.north,
    ],
    OWNED_AERIAL_ARTIFACT.bbox,
  );
  assert.match(OWNED_AERIAL_PMTILES_PATH, /caelrion-la-aerial-r01/);
  assert.equal(BASEMAP_MODE_DARK, 'dark-vector');
  assert.equal(BASEMAP_MODE_SATELLITE, 'owned-aerial');
});
