import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  ESRI_ATTRIBUTION_HTML,
  ESRI_SOURCE_ATTRIBUTION,
} from './imagery.js';

test('Esri credit has source text and no promotional Powered by Esri link', () => {
  assert.equal(ESRI_ATTRIBUTION_HTML, ESRI_SOURCE_ATTRIBUTION);
  assert.doesNotMatch(ESRI_ATTRIBUTION_HTML, /powered by esri/i);
  assert.doesNotMatch(ESRI_ATTRIBUTION_HTML, /href\s*=\s*["'][^"']*esri\.com/i);
  assert.match(ESRI_SOURCE_ATTRIBUTION, /Esri/);
  assert.match(ESRI_SOURCE_ATTRIBUTION, /Maxar/);
});
