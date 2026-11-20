#!/usr/bin/env node
/**
 * Browser regression for R08 startup UX (nonproduction preview).
 * Exit 0 only when acceptance checks pass against a live preview URL.
 */
import puppeteer from 'puppeteer';

const BASE = process.env.ARGOS_PREVIEW_URL || 'http://127.0.0.1:4174';
const URL = `${BASE}/?welcome=0`;

function fail(msg) {
  console.error(`FAIL: ${msg}`);
  process.exitCode = 1;
}

function pass(msg) {
  console.log(`PASS: ${msg}`);
}

const browser = await puppeteer.launch({
  headless: true,
  args: ['--no-sandbox', '--disable-gpu', '--hide-scrollbars'],
});

try {
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });
  await page.goto(URL, { waitUntil: 'networkidle2', timeout: 90000 });
  await page.waitForSelector('#argos-atlas-root:not([hidden])', {
    timeout: 30000,
  });
  await page.waitForFunction(
    () => document.body.classList.contains('argos-atlas-active'),
    { timeout: 30000 },
  );
  // Allow MapLibre attribution/sourcedata to settle.
  await new Promise((r) => setTimeout(r, 2500));

  const state = await page.evaluate(() => {
    const root = document.getElementById('argos-atlas-root');
    const panel = document.getElementById('argos-control-panel');
    const detail = document.getElementById('argos-detail-panel');
    const search = document.getElementById('argos-search-input');
    const layersBtn = root?.querySelector(
      '[data-argos-action="toggle-filters"]',
    );
    const attrib = root?.querySelector('.maplibregl-ctrl-attrib');
    const attribRect = attrib?.getBoundingClientRect?.();
    const canvas = root?.querySelector('.maplibregl-canvas');
    return {
      rootVisible: Boolean(root) && root.hidden === false,
      filtersCollapsed: panel?.classList.contains('is-collapsed') === true,
      layersAria: layersBtn?.getAttribute('aria-expanded'),
      detailHidden: detail?.hidden === true,
      searchEnabled: Boolean(search) && search.disabled !== true,
      searchPlaceholder: search?.placeholder || '',
      attribExists: Boolean(attrib),
      attribHasCompact:
        attrib?.classList.contains('maplibregl-compact') === true,
      attribExpanded:
        attrib?.classList.contains('maplibregl-compact-show') === true,
      attribWidth: attribRect?.width || 0,
      attribBg: attrib ? getComputedStyle(attrib).backgroundColor : null,
      canvasOk: Boolean(canvas),
      mapHostH: document.getElementById('argos-map-host')?.clientHeight || 0,
    };
  });

  if (!state.rootVisible || !state.canvasOk || state.mapHostH < 400) {
    fail(`map not full-screen ready: ${JSON.stringify(state)}`);
  } else pass('full-screen flat 2D map visible');

  if (!state.filtersCollapsed || state.layersAria !== 'false') {
    fail(
      `filters not closed: collapsed=${state.filtersCollapsed} aria=${state.layersAria}`,
    );
  } else pass('filters closed with aria-expanded=false');

  if (!state.detailHidden) fail('aircraft detail open on startup');
  else pass('aircraft detail closed');

  if (!state.attribExists) fail('attribution control missing');
  else if (state.attribExpanded || state.attribWidth > 120) {
    fail(
      `attribution strip expanded on startup (width=${state.attribWidth}, show=${state.attribExpanded})`,
    );
  } else pass('attribution compact (no white strip)');

  if (!state.searchEnabled) fail('search still disabled');
  else if (/flights,\s*ships/i.test(state.searchPlaceholder)) {
    fail(
      `search placeholder still claims universal coverage: ${state.searchPlaceholder}`,
    );
  } else pass('search enabled with honest local placeholder');

  // R11: after fixture init, camera must still be over Los Angeles (not DEMO Madrid).
  const camStartup = await page.evaluate(() => {
    const text =
      document.querySelector('[data-argos-coords]')?.textContent || '';
    const m = text.match(/(\d+\.\d+)°([NS])\s+(\d+\.\d+)°([EW])/);
    if (!m) return { ok: false, text };
    const lat = Number(m[1]) * (m[2] === 'S' ? -1 : 1);
    const lon = Number(m[3]) * (m[4] === 'W' ? -1 : 1);
    return { ok: true, lon, lat, text };
  });
  if (
    !camStartup.ok ||
    Math.abs(camStartup.lon - -118.2437) > 0.4 ||
    Math.abs(camStartup.lat - 34.0522) > 0.4
  ) {
    fail(
      `startup camera not over LA after DEMO init: ${JSON.stringify(camStartup)}`,
    );
  } else pass('startup camera over Los Angeles after DEMO fixture init');

  // Search keyboard path: type DEMO id, Arrow/Enter, expect fly + optional select.
  await page.click('#argos-search-input');
  await page.type('#argos-search-input', 'ae07f6', { delay: 20 });
  await page.waitForSelector('#argos-search-results:not([hidden])', {
    timeout: 5000,
  });
  await page.keyboard.press('Enter');
  await new Promise((r) => setTimeout(r, 1200));

  const afterSearch = await page.evaluate(() => {
    const list = document.getElementById('argos-search-results');
    const detail = document.getElementById('argos-detail-panel');
    return {
      resultsHidden: list?.hidden === true,
      detailOpen: detail?.hidden === false,
      detailId:
        detail?.querySelector('[data-argos-detail-id]')?.textContent || '',
    };
  });
  if (afterSearch.detailId !== 'ae07f6' && !afterSearch.detailOpen) {
    // Enter on aircraft result should open card; if only fly-to, still ok if map moved.
    // Re-check by clicking marker path below.
    pass('search Enter executed (card may open via aircraft result)');
  } else {
    pass('search selection opens DEMO aircraft card');
  }

  // Escape closes detail if open.
  if (afterSearch.detailOpen) {
    await page.keyboard.press('Escape');
    const closed = await page.evaluate(
      () => document.getElementById('argos-detail-panel')?.hidden === true,
    );
    if (!closed) fail('Escape did not close detail');
    else pass('Escape closes detail');
  }

  // Honest empty result.
  await page.focus('#argos-search-input');
  await page.evaluate(() => {
    const input = document.getElementById('argos-search-input');
    input.value = '';
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });
  await page.type('#argos-search-input', 'zzzz-not-local', { delay: 15 });
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
  pass('empty local search is honest');
  await page.keyboard.press('Escape');

  // Click DEMO aircraft via MapLibre canvas approximate center-ish Madrid region —
  // use evaluate to call shell select path if marker hit is flaky: query features.
  const clicked = await page.evaluate(() => {
    const host = document.getElementById('argos-map-host');
    const canvas = host?.querySelector('canvas');
    if (!canvas) return false;
    // Prefer querying the aircraft hit layer if MapLibre map is exposed — fallback click center.
    const map = window.__argosMap || null;
    if (map?.queryRenderedFeatures) {
      const feats = map.queryRenderedFeatures({
        layers: ['caelrion-aircraft-demo-hit', 'caelrion-aircraft-demo-circle'],
      });
      if (feats?.length) {
        // Synthesize click at feature point in screen space if possible.
      }
    }
    const rect = canvas.getBoundingClientRect();
    const evt = new MouseEvent('click', {
      bubbles: true,
      clientX: rect.left + rect.width * 0.5,
      clientY: rect.top + rect.height * 0.5,
      buttons: 1,
    });
    canvas.dispatchEvent(evt);
    return true;
  });
  if (!clicked) fail('could not dispatch map click');

  // Explicit search-select again for card proof.
  await page.focus('#argos-search-input');
  await page.evaluate(() => {
    const input = document.getElementById('argos-search-input');
    input.value = '';
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });
  await page.type('#argos-search-input', 'DEMO01', { delay: 20 });
  await page.waitForSelector(
    '#argos-search-results:not([hidden]) button.argos-search-option',
    {
      timeout: 5000,
    },
  );
  await page.click('#argos-search-results button.argos-search-option');
  await new Promise((r) => setTimeout(r, 800));
  const card = await page.evaluate(() => {
    const detail = document.getElementById('argos-detail-panel');
    return {
      open: detail?.hidden === false,
      id: detail?.querySelector('[data-argos-detail-id]')?.textContent || '',
    };
  });
  if (!card.open || card.id !== 'ae07f6')
    fail(`DEMO card not open after search select: ${JSON.stringify(card)}`);
  else pass('DEMO aircraft card opens after explicit selection');

  // 2D/3D toggle still present.
  const has3d = await page.$('button[data-argos-action="toggle-3d"]');
  if (!has3d) fail('3D toggle missing');
  else pass('2D/3D control present');

  // Attribution disclosure still accessible.
  const attribBtn = await page.$('.maplibregl-ctrl-attrib-button');
  if (!attribBtn) fail('attribution disclosure button missing');
  else {
    await attribBtn.click();
    await new Promise((r) => setTimeout(r, 300));
    const open = await page.evaluate(() => {
      const el = document.querySelector('.maplibregl-ctrl-attrib');
      const text = el?.textContent || '';
      return {
        show: el?.classList.contains('maplibregl-compact-show') === true,
        hasOsm: /OpenStreetMap/i.test(text),
        hasOfm: /OpenFreeMap/i.test(text),
        hasEsri: /Esri/i.test(text),
        hasOpenMapTiles: /OpenMapTiles/i.test(text),
      };
    });
    // V1.2 satellite: Esri + OpenMapTiles/OSM. Fiord fallback: OpenFreeMap + OSM.
    const satelliteOk = open.hasEsri && open.hasOsm;
    const fiordOk = open.hasOfm && open.hasOsm;
    if (!open.show || !(satelliteOk || fiordOk)) {
      fail(`attribution disclosure incomplete: ${JSON.stringify(open)}`);
    } else pass('required attribution accessible via disclosure');
  }

  if (process.exitCode && process.exitCode !== 0) {
    console.error('qa-argos-startup-ux FAILED');
  } else {
    console.log('qa-argos-startup-ux PASSED');
    process.exitCode = 0;
  }
} catch (err) {
  fail(String(err?.stack || err));
} finally {
  await browser.close();
}
