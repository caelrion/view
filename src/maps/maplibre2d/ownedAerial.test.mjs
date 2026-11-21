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

test('R21: Satellite gold hierarchy; residential off-white; Dark unchanged', () => {
  const aerial = createAerialOverlayFlavor();
  assert.equal(aerial.highway, '#D2B56A');
  assert.equal(aerial.major, '#BFA876');
  assert.equal(aerial.link, '#BFA876');
  assert.equal(aerial.bridges_highway, '#D2B56A');
  assert.equal(aerial.bridges_major, '#BFA876');
  assert.equal(aerial.tunnel_highway, '#D2B56A');
  // Residential never receives gold highlight.
  assert.equal(aerial.minor_a, '#C8D0D4');
  assert.equal(aerial.minor_b, '#C8D0D4');
  assert.equal(aerial.other, '#C8D0D4');
  assert.equal(aerial.minor_service, '#C8D0D4');
  assert.equal(aerial.bridges_minor, '#C8D0D4');
  assert.notEqual(aerial.minor_a, aerial.highway);
  assert.notEqual(aerial.minor_a, aerial.major);
  // Style applies satellite restraint so minors stay faint.
  const style = createOwnedAerialStyle();
  const minor = style.layers.find((l) => l.id === 'roads_minor');
  const highway = style.layers.find((l) => l.id === 'roads_highway');
  assert.ok(Array.isArray(minor?.paint?.['line-opacity']));
  assert.equal(minor.paint['line-opacity'][0], 'interpolate');
  // Residential stays subdued; last stop well below an opaque street carpet.
  const minorStops = minor.paint['line-opacity'];
  const lastOpacity = minorStops[minorStops.length - 1];
  assert.ok(typeof lastOpacity === 'number' && lastOpacity <= 0.4);
  assert.equal(highway?.paint?.['line-color'], '#D2B56A');
  // R26/R04/R27: soft gold trunk; neutral primary/secondary; tertiary subtle.
  const major = style.layers.find((l) => l.id === 'roads_major');
  const primary = style.layers.find((l) => l.id === 'roads_primary');
  const secondary = style.layers.find((l) => l.id === 'roads_secondary');
  const tertiary = style.layers.find((l) => l.id === 'roads_tertiary');
  assert.ok(major);
  assert.ok(primary);
  assert.ok(secondary);
  assert.ok(tertiary);
  assert.equal(major.paint['line-color'], '#BFA876');
  assert.equal(primary.paint['line-color'], '#E4E9ED');
  assert.equal(secondary.paint['line-color'], '#C5CDD3');
  assert.equal(tertiary.paint['line-color'], '#C8D0D4');
  // R27: highway opacity capped below full-bright.
  const hwyOpacity = highway.paint['line-opacity'];
  assert.equal(hwyOpacity[0], 'interpolate');
  assert.ok(hwyOpacity[hwyOpacity.length - 1] <= 0.92);
  assert.ok(JSON.stringify(major.filter).includes('trunk'));
  assert.equal(JSON.stringify(major.filter).includes('primary'), false);
  assert.ok(JSON.stringify(primary.filter).includes('primary'));
  assert.ok(style.layers.some((l) => l.id === 'roads_labels_primary'));
  // R17 Dark palette untouched.
  const dark = createArgosDarkFlavor();
  assert.equal(dark.highway, '#47575B');
  assert.equal(dark.major, '#374448');
  assert.equal(dark.minor_a, '#2B363A');
  const darkStyle = createOwnedBasemapStyle();
  assert.equal(
    darkStyle.layers.find((l) => l.id === 'roads_highway')?.paint?.[
      'line-color'
    ],
    '#47575B',
  );
});

test('P0: owned dark style still uses same-origin PMTiles + glyphs', () => {
  const style = createOwnedBasemapStyle();
  assert.equal(style.name, 'caelrion-owned-protomaps-dark');
  assert.match(style.sources.protomaps.url, /^pmtiles:\/\//);
  assert.ok(!style.sources['esri-world-imagery']);
});

test('P0: Satellite style streams EOx + GIBS + NAIP LA detail (no Esri planet)', () => {
  const style = createOwnedAerialStyle();
  assert.equal(style.name, 'caelrion-streamed-eox-satellite');
  assert.ok(style.sources['eox-cloudless-2016']);
  assert.ok(style.sources['gibs-blue-marble']);
  assert.ok(style.sources['naip-la']);
  assert.equal(style.sources['eox-cloudless-2016'].type, 'raster');
  assert.equal(
    style.sources['eox-cloudless-2016'].tiles[0],
    EOX_CLOUDLESS_2016_TILE_URL,
  );
  assert.equal(
    style.sources['gibs-blue-marble'].tiles[0],
    GIBS_BLUE_MARBLE_TILE_URL,
  );
  assert.match(style.sources['naip-la'].url, /pmtiles:\/\/.*la-aerial/);
  assert.ok(!style.sources['esri-world-imagery']);
  assert.match(EOX_CLOUDLESS_2016_TILE_URL, /s2cloudless_3857/);
  assert.match(EOX_CLOUDLESS_2016_TILE_URL, /\{z\}\/\{y\}\/\{x\}/);
  assert.match(MAP_ATTRIBUTION_HTML_AERIAL, /EOX|Sentinel-2 cloudless/);
  assert.match(MAP_ATTRIBUTION_HTML_AERIAL, /Blue Marble|NASA/);
  assert.match(MAP_ATTRIBUTION_HTML_AERIAL, /NAIP/i);
  assert.doesNotMatch(MAP_ATTRIBUTION_HTML_AERIAL, /Esri World Imagery/i);
  assert.ok(style.layers.some((l) => l.id === 'eox-cloudless-raster'));
  assert.ok(style.layers.some((l) => l.id === 'gibs-blue-marble-raster'));
  assert.ok(style.layers.some((l) => l.id === 'naip-la-raster'));
  assert.ok(style.layers.some((l) => String(l.id).startsWith('roads_')));
  // R25: night water tint sits above rasters and below road overlays.
  const waterIdx = style.layers.findIndex(
    (l) => l.id === 'satellite-night-water',
  );
  const roadIdx = style.layers.findIndex((l) =>
    String(l.id).startsWith('roads_'),
  );
  const eoxIdx = style.layers.findIndex((l) => l.id === 'eox-cloudless-raster');
  assert.ok(waterIdx > eoxIdx);
  assert.ok(waterIdx < roadIdx);
  assert.equal(style.layers[waterIdx].paint['fill-color'], '#050E18');
  // Default (no center/factor) stays daylight water opacity.
  assert.equal(style.layers[waterIdx].paint['fill-opacity'], 0);
});

test('R26: first-frame Satellite style bakes night paint for known center', () => {
  // California deep night UTC — same fixture family as solarDayNight tests.
  const nightMs = Date.UTC(2026, 6, 2, 8, 0, 0);
  const style = createOwnedAerialStyle({
    center: [...DEFAULT_MAP_CENTER],
    nowMs: nightMs,
  });
  assert.ok(style.metadata['caelrion:satellite-night-factor'] > 0.9);
  const eox = style.layers.find((l) => l.id === 'eox-cloudless-raster');
  assert.ok(eox.paint['raster-brightness-max'] < 0.7);
  assert.ok(eox.paint['raster-saturation'] < -0.4);
  const water = style.layers.find((l) => l.id === 'satellite-night-water');
  assert.ok(water.paint['fill-opacity'] > 0.6);
  // Daytime Cairo at same UTC stays natural.
  const dayStyle = createOwnedAerialStyle({
    center: [31.2357, 30.0444],
    nowMs: nightMs,
  });
  assert.equal(dayStyle.metadata['caelrion:satellite-night-factor'], 0);
  const dayEox = dayStyle.layers.find((l) => l.id === 'eox-cloudless-raster');
  assert.equal(dayEox.paint['raster-brightness-max'], 1);
  assert.equal(dayEox.paint['raster-saturation'], 0);
});

test('P0: aerial overlay filter drops opaque land fills', () => {
  const all = layers('protomaps', createAerialOverlayFlavor(), { lang: 'en' });
  const kept = selectAerialOverlayLayers(all);
  assert.ok(kept.length > 10);
  assert.ok(kept.every((l) => l.id !== 'earth' && l.id !== 'water'));
});

test('P0: streamed coverage ready worldwide; limited past EOx unless NAIP LA', () => {
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
  // Huntington Beach is outside the verified NAIP footprint.
  assert.equal(
    aerialCoverageState({
      lon: -117.99833,
      lat: 33.66028,
      zoom: EOX_MAX_ZOOM + 2,
    }),
    'limited-coverage',
  );
  // Downtown LA inside NAIP remains ready past EOx max.
  assert.equal(
    aerialCoverageState({
      lon: -118.2437,
      lat: 34.0522,
      zoom: EOX_MAX_ZOOM + 2,
    }),
    'ready',
  );
  assert.equal(BASEMAP_MODE_DARK, 'dark-vector');
  assert.equal(BASEMAP_MODE_SATELLITE, 'owned-aerial');
});

test('R19-2: dark style road layers carry progressive opacity', () => {
  const style = createOwnedBasemapStyle();
  const minor = style.layers.find((l) => l.id === 'roads_minor');
  const highway = style.layers.find((l) =>
    String(l.id).startsWith('roads_highway'),
  );
  assert.ok(minor?.paint?.['line-opacity']);
  assert.ok(Array.isArray(minor.paint['line-opacity']));
  assert.equal(minor.paint['line-opacity'][0], 'interpolate');
  assert.ok(highway?.paint?.['line-opacity']);
});
