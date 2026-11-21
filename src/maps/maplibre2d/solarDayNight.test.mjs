import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  solarElevationDeg,
  nightFactorFromSolarElevation,
  rasterPaintForNightFactor,
  waterTintOpacityForNightFactor,
  applySatelliteDayNightPaint,
  createSatelliteNightWaterLayer,
  nightFactorForMapCenter,
  SATELLITE_RASTER_LAYER_IDS,
  SATELLITE_NIGHT_WATER_LAYER_ID,
  SATELLITE_NIGHT_WATER_COLOR,
} from './solarDayNight.js';

/** Newport Beach / HB approx. */
const HB = { lon: -117.99833, lat: 33.66028 };

test('R25: California noon is daylight; California midnight is night (UTC clock)', () => {
  // 2026-07-01 20:00 UTC ≈ 13:00 PDT — sun high over SoCal
  const dayMs = Date.UTC(2026, 6, 1, 20, 0, 0);
  const dayElev = solarElevationDeg(HB.lat, HB.lon, dayMs);
  assert.ok(dayElev > 20, `expected high sun, got ${dayElev}`);
  assert.equal(nightFactorFromSolarElevation(dayElev), 0);

  // 2026-07-02 08:00 UTC ≈ 01:00 PDT — deep night
  const nightMs = Date.UTC(2026, 6, 2, 8, 0, 0);
  const nightElev = solarElevationDeg(HB.lat, HB.lon, nightMs);
  assert.ok(nightElev < -12, `expected night, got ${nightElev}`);
  assert.equal(nightFactorFromSolarElevation(nightElev), 1);
});

test('R25: same UTC instant — California night while Europe may be day', () => {
  const ms = Date.UTC(2026, 6, 2, 8, 0, 0); // 08:00 UTC
  const ca = solarElevationDeg(HB.lat, HB.lon, ms);
  const berlin = solarElevationDeg(52.52, 13.405, ms);
  assert.ok(ca < -6, `CA should be dark (${ca})`);
  assert.ok(berlin > 0, `Berlin should be day (${berlin})`);
  assert.ok(
    nightFactorForMapCenter({ lat: HB.lat, lon: HB.lon, nowMs: ms }) >
      nightFactorForMapCenter({ lat: 52.52, lon: 13.405, nowMs: ms }),
  );
});

test('R25: longitude wrap and invalid coords are safe', () => {
  const ms = Date.UTC(2026, 0, 1, 12, 0, 0);
  const a = solarElevationDeg(0, 179.9, ms);
  const b = solarElevationDeg(0, -179.9, ms);
  assert.ok(Number.isFinite(a) && Number.isFinite(b));
  assert.equal(solarElevationDeg(95, 0, ms), 0);
  assert.equal(solarElevationDeg(0, 200, ms), 0);
  assert.equal(solarElevationDeg(NaN, 0, ms), 0);
});

test('R25: high-latitude summer midnight sun stays day-ish', () => {
  // Tromsø midsummer midnight local ≈ 2026-06-21 22:00 UTC
  const ms = Date.UTC(2026, 5, 21, 22, 0, 0);
  const elev = solarElevationDeg(69.65, 18.96, ms);
  assert.ok(elev > -6, `midnight sun should not be full night (${elev})`);
  assert.ok(nightFactorFromSolarElevation(elev) < 1);
});

test('R25: twilight factor is smooth and monotonic', () => {
  const samples = [10, 0, -3, -6, -9, -12, -20].map((e) =>
    nightFactorFromSolarElevation(e),
  );
  for (let i = 1; i < samples.length; i++) {
    assert.ok(samples[i] >= samples[i - 1] - 1e-9);
  }
  assert.equal(samples[0], 0);
  assert.equal(samples.at(-1), 1);
});

test('R25/R02: night raster is dramatically darker than day; water more opaque than land crush', () => {
  const day = rasterPaintForNightFactor(0);
  const night = rasterPaintForNightFactor(1);
  assert.equal(day['raster-saturation'], 0);
  assert.equal(day['raster-brightness-max'], 1);
  assert.equal(day['raster-hue-rotate'], 0);
  // Wide day/night separation — not a mild dim.
  assert.ok(night['raster-saturation'] <= -0.9);
  assert.ok(night['raster-brightness-max'] <= 0.3);
  assert.ok(night['raster-contrast'] >= 0.35);
  assert.ok(night['raster-hue-rotate'] >= 180);
  assert.ok(
    day['raster-brightness-max'] - night['raster-brightness-max'] >= 0.65,
    'day/night brightness gap must be obvious at a glance',
  );
  assert.equal(waterTintOpacityForNightFactor(0), 0);
  assert.ok(waterTintOpacityForNightFactor(1) >= 0.88);
  assert.ok(
    waterTintOpacityForNightFactor(1) > 1 - night['raster-brightness-max'],
  );
});

test('R25: applySatelliteDayNightPaint sets rasters + water without touching opacity expressions', () => {
  const paints = new Map();
  const map = {
    getLayer(id) {
      return SATELLITE_RASTER_LAYER_IDS.includes(id) ||
        id === SATELLITE_NIGHT_WATER_LAYER_ID
        ? { id }
        : null;
    },
    setPaintProperty(id, prop, value) {
      paints.set(`${id}:${prop}`, value);
    },
  };
  applySatelliteDayNightPaint(map, 1);
  assert.ok(paints.has('eox-cloudless-raster:raster-saturation'));
  assert.ok(paints.has('gibs-blue-marble-raster:raster-brightness-max'));
  assert.ok(paints.has('naip-la-raster:raster-contrast'));
  assert.equal(
    paints.get(`${SATELLITE_NIGHT_WATER_LAYER_ID}:fill-opacity`) > 0.6,
    true,
  );
  assert.equal(
    [...paints.keys()].some((k) => k.endsWith(':raster-opacity')),
    false,
  );
});

test('R25: night water layer uses Protomaps water under overlays', () => {
  const layer = createSatelliteNightWaterLayer();
  assert.equal(layer.id, SATELLITE_NIGHT_WATER_LAYER_ID);
  assert.equal(layer.source, 'protomaps');
  assert.equal(layer['source-layer'], 'water');
  assert.equal(layer.paint['fill-color'], SATELLITE_NIGHT_WATER_COLOR);
  assert.equal(layer.paint['fill-opacity'], 0);
});
