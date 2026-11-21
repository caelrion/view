import test from 'node:test';
import assert from 'node:assert/strict';
import {
  applyProgressiveRoadDetail,
  applySatelliteResidentialRestraint,
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
  assert.ok(minorStops[minorStops.length - 1] <= 0.35);
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
