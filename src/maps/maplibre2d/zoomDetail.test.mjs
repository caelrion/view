import test from 'node:test';
import assert from 'node:assert/strict';
import { applyProgressiveRoadDetail } from './zoomDetail.js';

test('R19-2: progressive opacity wraps minor/major/highway/label layers', () => {
  const layers = applyProgressiveRoadDetail([
    { id: 'roads_minor', type: 'line', paint: { 'line-color': '#fff' } },
    { id: 'roads_major', type: 'line', paint: { 'line-color': '#eee' } },
    {
      id: 'roads_highway_casing',
      type: 'line',
      paint: { 'line-color': '#ddd' },
    },
    {
      id: 'roads_label_major',
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
