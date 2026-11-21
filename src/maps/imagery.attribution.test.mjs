import assert from 'node:assert/strict';
import { test } from 'node:test';
import { ESRI_ATTRIBUTION_HTML, ESRI_SOURCE_ATTRIBUTION } from './imagery.js';

test('Esri on-screen credit strip is empty (no Powered by Esri / source footer)', () => {
  assert.equal(ESRI_ATTRIBUTION_HTML, ESRI_SOURCE_ATTRIBUTION);
  assert.equal(ESRI_SOURCE_ATTRIBUTION, '');
  assert.doesNotMatch(ESRI_ATTRIBUTION_HTML, /powered by esri/i);
  assert.doesNotMatch(ESRI_ATTRIBUTION_HTML, /href\s*=\s*["'][^"']*esri\.com/i);
});
