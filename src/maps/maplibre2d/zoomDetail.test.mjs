import test from 'node:test';
import assert from 'node:assert/strict';
import {
  applyProgressiveRoadDetail,
  applySatelliteResidentialRestraint,
  applySatelliteSelectiveGoldRoads,
  SATELLITE_GOLD_MAJOR_KIND_DETAILS,
  SATELLITE_DEMOTE_MAJOR_KIND_DETAILS,
} from './zoomDetail.js';

test('R19-2: progressive opacity wraps minor/major/highway/label layers', () => {
  const layers = applyProgressiveRoadDetail([
    { id: 'roads_minor', type: 'line', paint: { 'line-color': '#fff' } },
    { id: 'roads_major', type: 'line', paint: { 'line-color': '#eee' } },
    {
      id: 'roads_highway_casing_late',
      type: 'line',
      paint: { 'line-color': '#ddd' },
    },
    {
      id: 'roads_labels_major',
      type: 'symbol',
      paint: { 'text-color': '#ccc' },
    },
    {
      id: 'roads_shields',
      type: 'symbol',
      paint: { 'text-color': '#bbb', 'icon-opacity': 1 },
    },
    { id: 'water', type: 'fill', paint: { 'fill-color': '#0A2A38' } },
  ]);
  assert.equal(layers[0].paint['line-opacity'][0], 'interpolate');
  assert.equal(layers[1].paint['line-opacity'][0], 'interpolate');
  assert.equal(layers[2].paint['line-opacity'][0], 'interpolate');
  assert.equal(layers[3].paint['text-opacity'][0], 'interpolate');
  assert.equal(layers[4].paint['icon-opacity'][0], 'interpolate');
  assert.equal(layers[5].paint['fill-color'], '#0A2A38');
  assert.equal(layers[5].paint['line-opacity'], undefined);
});

test('R21: satellite restraint caps residential; leaves highway/major alone', () => {
  const base = applyProgressiveRoadDetail([
    { id: 'roads_minor', type: 'line', paint: { 'line-color': '#E8ECEE' } },
    { id: 'roads_highway', type: 'line', paint: { 'line-color': '#E5C56B' } },
    { id: 'roads_link', type: 'line', paint: { 'line-color': '#D6BE82' } },
    {
      id: 'roads_labels_minor',
      type: 'symbol',
      paint: { 'text-color': '#D8DEE2' },
    },
  ]);
  const next = applySatelliteResidentialRestraint(base);
  const minorStops = next[0].paint['line-opacity'];
  assert.ok(minorStops[minorStops.length - 1] <= 0.22);
  // Highway / link (major class) keep progressive highway/major curves.
  assert.deepEqual(
    next[1].paint['line-opacity'],
    base[1].paint['line-opacity'],
  );
  assert.deepEqual(
    next[2].paint['line-opacity'],
    base[2].paint['line-opacity'],
  );
  assert.equal(next[3].paint['text-opacity'][0], 'interpolate');
});

test('R26: selective gold keeps trunk; demotes primary/secondary; preserves highway', () => {
  const layers = applySatelliteSelectiveGoldRoads([
    {
      id: 'roads_highway',
      type: 'line',
      filter: ['==', 'kind', 'highway'],
      paint: { 'line-color': '#E5C56B' },
    },
    {
      id: 'roads_major',
      type: 'line',
      filter: ['==', 'kind', 'major_road'],
      paint: { 'line-color': '#D6BE82' },
    },
    {
      id: 'roads_link',
      type: 'line',
      filter: ['has', 'is_link'],
      paint: { 'line-color': '#D6BE82' },
    },
    {
      id: 'roads_labels_major',
      type: 'symbol',
      filter: ['in', 'kind', 'highway', 'major_road'],
      paint: { 'text-color': '#E8D9A8' },
    },
  ]);
  const ids = layers.map((l) => l.id);
  assert.ok(ids.includes('roads_highway'));
  assert.ok(ids.includes('roads_major'));
  assert.ok(ids.includes('roads_secondary'));
  assert.ok(ids.includes('roads_link'));
  assert.ok(ids.includes('roads_link_local'));

  const major = layers.find((l) => l.id === 'roads_major');
  const secondary = layers.find((l) => l.id === 'roads_secondary');
  const link = layers.find((l) => l.id === 'roads_link');
  const linkLocal = layers.find((l) => l.id === 'roads_link_local');
  const labels = layers.find((l) => l.id === 'roads_labels_major');

  assert.equal(major.paint['line-color'], '#D6BE82');
  assert.equal(secondary.paint['line-color'], '#C8D0D4');
  assert.equal(linkLocal.paint['line-color'], '#C8D0D4');
  assert.ok(JSON.stringify(major.filter).includes('trunk'));
  assert.equal(JSON.stringify(major.filter).includes('primary'), false);
  assert.ok(JSON.stringify(secondary.filter).includes('primary'));
  assert.ok(JSON.stringify(secondary.filter).includes('secondary'));
  assert.ok(JSON.stringify(link.filter).includes('motorway_link'));
  assert.ok(JSON.stringify(labels.filter).includes('trunk'));
  // Hostile: demoted classes must not remain on the gold major filter.
  for (const d of SATELLITE_DEMOTE_MAJOR_KIND_DETAILS) {
    assert.equal(
      SATELLITE_GOLD_MAJOR_KIND_DETAILS.includes(d),
      false,
      `${d} must not be gold-major`,
    );
  }
});
