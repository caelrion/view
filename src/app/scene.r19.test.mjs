import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '../..');

test('R19-0: ion-free body class only hides Cesium logo mark, not credits', () => {
  const css = readFileSync(join(root, 'src/ui/styles/argos-atlas.css'), 'utf8');
  assert.match(
    css,
    /body\.caelrion-no-cesium-ion \.cesium-credit-logoContainer/,
  );
  assert.doesNotMatch(
    css,
    /body\.caelrion-no-cesium-ion #cesium-credits[^{]*\{[^}]*display:\s*none/,
  );
  assert.doesNotMatch(
    css,
    /body\.caelrion-no-cesium-ion \.cesium-widget-credits\s*\{[^}]*display:\s*none/,
  );
});

test('R19-0: scene toggles caelrion-no-cesium-ion when route is not google-ion', () => {
  const scene = readFileSync(join(root, 'src/app/scene.js'), 'utf8');
  assert.match(scene, /photoreal\.route === 'google-ion'/);
  assert.match(
    scene,
    /classList\.toggle\('caelrion-no-cesium-ion', !ionRouteActive\)/,
  );
});
