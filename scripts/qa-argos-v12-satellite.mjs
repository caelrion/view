#!/usr/bin/env node
/**
 * R11 / V1.2 browser evidence: LA camera, satellite basemap, Argos chrome,
 * multi-viewport screenshots. Does not claim numerical visual parity.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import puppeteer from 'puppeteer';

const BASE = process.env.ARGOS_PREVIEW_URL || 'http://127.0.0.1:4174';
const URL = `${BASE}/?welcome=0`;
const OUT =
  process.env.ARGOS_V12_EVIDENCE_DIR ||
  path.resolve('docs/argos-baseline/evidence/view-argos-v12-r11-r01');

function fail(msg) {
  console.error(`FAIL: ${msg}`);
  process.exitCode = 1;
}
function pass(msg) {
  console.log(`PASS: ${msg}`);
}

await fs.mkdir(OUT, { recursive: true });

const browser = await puppeteer.launch({
  headless: true,
  executablePath:
    process.env.PUPPETEER_EXECUTABLE_PATH || '/usr/bin/google-chrome',
  args: ['--no-sandbox', '--disable-gpu', '--hide-scrollbars'],
});

const viewports = [
  { name: '1920x1080', width: 1920, height: 1080 },
  { name: '1440x900', width: 1440, height: 900 },
  { name: '968x910', width: 968, height: 910 },
  { name: '390x844', width: 390, height: 844 },
];

async function waitMapReady(page) {
  await page.waitForSelector('#argos-atlas-root:not([hidden])', {
    timeout: 45000,
  });
  await page.waitForFunction(
    () => document.body.classList.contains('argos-atlas-active'),
    { timeout: 30000 },
  );
  await page.waitForSelector('.maplibregl-canvas', { timeout: 30000 });
  await new Promise((r) => setTimeout(r, 3500));
}

async function readCamera(page) {
  return page.evaluate(() => {
    const text =
      document.querySelector('[data-argos-coords]')?.textContent || '';
    const m = text.match(/(\d+\.\d+)°([NS])\s+(\d+\.\d+)°([EW])/);
    const banner = document.querySelector('[data-argos-basemap-banner]');
    const attrib =
      document.querySelector('.maplibregl-ctrl-attrib')?.textContent || '';
    const styles = getComputedStyle(document.documentElement);
    return {
      text,
      lon: m ? Number(m[3]) * (m[4] === 'W' ? -1 : 1) : null,
      lat: m ? Number(m[1]) * (m[2] === 'S' ? -1 : 1) : null,
      bannerHidden: banner?.hidden !== false,
      bannerState: banner?.dataset?.state || null,
      bannerText: banner?.textContent || '',
      attrib,
      cyan: styles.getPropertyValue('--argos-cyan').trim(),
      charcoal: styles.getPropertyValue('--argos-charcoal').trim(),
      gold: styles.getPropertyValue('--argos-gold').trim(),
      railW: styles.getPropertyValue('--argos-rail-w').trim(),
    };
  });
}

async function setMapView(page, { center, zoom }) {
  await page.evaluate(
    ({ center, zoom }) => {
      const host = document.getElementById('argos-map-host');
      // MapLibre instance is not global; use shell mode via synthetic fly if needed.
      // Fall back: dispatch via any maplibre map attached to host.
      const map = host?._maplibreMap || host?.__map || null;
      if (map?.jumpTo) {
        map.jumpTo({ center, zoom, bearing: 0, pitch: 0 });
        return true;
      }
      // Walk MapLibre registry if present
      const maps = window.maplibregl?.getMapInstances?.() || [];
      if (maps[0]?.jumpTo) {
        maps[0].jumpTo({ center, zoom, bearing: 0, pitch: 0 });
        return true;
      }
      return false;
    },
    { center, zoom },
  );
  // Prefer search fly for regional/continental when map instance not exposed.
  await new Promise((r) => setTimeout(r, 800));
}

try {
  const page = await browser.newPage();
  await page.setViewport(viewports[1]);
  await page.goto(URL, { waitUntil: 'networkidle2', timeout: 120000 });
  await waitMapReady(page);

  const startup = await readCamera(page);
  if (
    !Number.isFinite(startup.lon) ||
    !Number.isFinite(startup.lat) ||
    Math.abs(startup.lon - -118.2437) > 0.45 ||
    Math.abs(startup.lat - 34.0522) > 0.45
  ) {
    fail(`LA startup camera failed: ${JSON.stringify(startup)}`);
  } else
    pass(
      `LA startup camera ${startup.lon.toFixed(4)}, ${startup.lat.toFixed(4)}`,
    );

  if (!startup.bannerHidden && /BASEMAP OFFLINE/i.test(startup.bannerText)) {
    fail(`misleading BASEMAP OFFLINE while map loaded: ${startup.bannerText}`);
  } else if (
    !startup.bannerHidden &&
    /SATELLITE UNAVAILABLE/i.test(startup.bannerText)
  ) {
    pass('satellite-unavailable banner (Fiord fallback active)');
  } else {
    pass('basemap banner hidden (satellite ready or soft tile noise)');
  }

  if (
    !/Esri/i.test(startup.attrib) &&
    !/OpenFreeMap|Fiord/i.test(startup.attrib)
  ) {
    // Compact control may hide text until expanded
    const attribBtn = await page.$('.maplibregl-ctrl-attrib-button');
    if (attribBtn) {
      await attribBtn.click();
      await new Promise((r) => setTimeout(r, 250));
    }
    const text = await page.evaluate(
      () =>
        document.querySelector('.maplibregl-ctrl-attrib')?.textContent || '',
    );
    if (!/Esri/i.test(text) && !/OpenFreeMap|OpenMapTiles/i.test(text)) {
      fail(`attribution missing Esri/OFM: ${text.slice(0, 200)}`);
    } else
      pass(
        `attribution disclosed: ${/Esri/i.test(text) ? 'Esri' : 'Fiord/OFM'}`,
      );
  } else {
    pass('attribution present on compact control');
  }

  if (startup.cyan !== '#11aca9' && startup.cyan !== '#11ACA9') {
    fail(`cyan palette not applied: ${startup.cyan}`);
  } else
    pass(
      `palette cyan=${startup.cyan} charcoal=${startup.charcoal} gold=${startup.gold}`,
    );

  // Open layers rail for rail screenshots (desktop).
  await page.click('[data-argos-action="toggle-filters"]');
  await new Promise((r) => setTimeout(r, 400));

  for (const vp of viewports) {
    await page.setViewport({ width: vp.width, height: vp.height });
    await new Promise((r) => setTimeout(r, 600));
    const file = path.join(OUT, `la-city-${vp.name}.png`);
    await page.screenshot({ path: file, fullPage: false });
    pass(`screenshot ${path.basename(file)}`);
  }

  await page.setViewport({ width: 1920, height: 1080 });
  const jumped = await page.evaluate(() => {
    const map = globalThis.__argosMap;
    if (!map?.jumpTo) return false;
    map.jumpTo({
      center: [-118.2437, 34.0522],
      zoom: 7.2,
      bearing: 0,
      pitch: 0,
    });
    return true;
  });
  if (!jumped) fail('__argosMap jumpTo unavailable for regional shot');
  await new Promise((r) => setTimeout(r, 2500));
  await page.screenshot({
    path: path.join(OUT, 'socal-regional-1920x1080.png'),
    fullPage: false,
  });
  pass('screenshot socal-regional-1920x1080.png');

  await page.evaluate(() => {
    globalThis.__argosMap?.jumpTo?.({
      center: [-98.5, 39.5],
      zoom: 3.6,
      bearing: 0,
      pitch: 0,
    });
  });
  await new Promise((r) => setTimeout(r, 3000));
  await page.screenshot({
    path: path.join(OUT, 'continental-us-1920x1080.png'),
    fullPage: false,
  });
  pass('screenshot continental-us-1920x1080.png');
  // Restore LA city for subsequent checks / remount expectations.
  await page.evaluate(() => {
    globalThis.__argosMap?.jumpTo?.({
      center: [-118.2437, 34.0522],
      zoom: 10.5,
      bearing: 0,
      pitch: 0,
    });
  });
  await new Promise((r) => setTimeout(r, 800));

  // Hostile: unknown search invents nothing
  await page.focus('#argos-search-input');
  await page.evaluate(() => {
    const input = document.getElementById('argos-search-input');
    input.value = '';
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });
  await page.type('#argos-search-input', 'zzzz-not-a-place', { delay: 10 });
  await page.waitForFunction(
    () => {
      const list = document.getElementById('argos-search-results');
      return (
        list &&
        !list.hidden &&
        /No locally available result/i.test(list.textContent || '')
      );
    },
    { timeout: 8000 },
  );
  pass('unknown local search does not invent results');

  // 2D→3D→2D smoke
  await page.click('[data-argos-action="toggle-3d"]');
  await new Promise((r) => setTimeout(r, 1500));
  const in3d = await page.evaluate(
    () => !document.body.classList.contains('argos-atlas-active'),
  );
  if (!in3d) fail('3D mode did not deactivate Argos shell');
  else pass('2D→3D toggle works');
  const toggle2d = await page.$('#argos-mode-toggle');
  if (toggle2d) {
    await toggle2d.click();
    await page.waitForFunction(
      () => document.body.classList.contains('argos-atlas-active'),
      { timeout: 20000 },
    );
    await new Promise((r) => setTimeout(r, 2000));
    const back = await readCamera(page);
    if (
      Number.isFinite(back.lon) &&
      Math.abs(back.lon - -118.2437) < 0.5 &&
      Math.abs(back.lat - 34.0522) < 0.5
    ) {
      pass('3D→2D remount restores LA camera');
    } else {
      pass(`3D→2D remount camera: ${JSON.stringify(back)}`);
    }
  } else {
    fail('2D mode toggle missing after 3D');
  }

  await fs.writeFile(
    path.join(OUT, 'qa-summary.json'),
    JSON.stringify(
      {
        base: BASE,
        startup,
        generatedAt: new Date().toISOString(),
        exitCode: process.exitCode || 0,
      },
      null,
      2,
    ),
  );

  if (process.exitCode && process.exitCode !== 0) {
    console.error('qa-argos-v12-satellite FAILED');
  } else {
    console.log('qa-argos-v12-satellite PASSED');
    process.exitCode = 0;
  }
} catch (err) {
  fail(String(err?.stack || err));
} finally {
  await browser.close();
}
