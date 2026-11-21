import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  ArgosAtlasMode,
  preferArgos2DFromLocation,
  heightFromZoom,
  zoomFromHeight,
} from './mode.js';
import {
  formatUtcCoords,
  setBasemapBanner,
  setSatelliteControls,
} from './shell.js';
import { DEMO_AIRCRAFT_FIXTURE } from '../../presentation/demoAircraftFixture.js';
import {
  DEFAULT_MAP_CENTER,
  DEFAULT_MAP_ZOOM,
} from '../../maps/maplibre2d/style.js';

test('preferArgos2DFromLocation defaults to 2D; 3D is opt-in', () => {
  assert.equal(preferArgos2DFromLocation({ search: '', hash: '' }), true);
  assert.equal(
    preferArgos2DFromLocation({ search: '?view=argos-2d', hash: '' }),
    true,
  );
  assert.equal(
    preferArgos2DFromLocation({ search: '?map=2d', hash: '' }),
    true,
  );
  assert.equal(
    preferArgos2DFromLocation({ search: '', hash: '#view=argos-2d' }),
    true,
  );
  assert.equal(
    preferArgos2DFromLocation({ search: '?view=3d', hash: '' }),
    false,
  );
  assert.equal(
    preferArgos2DFromLocation({ search: '?map=3d', hash: '' }),
    false,
  );
  assert.equal(
    preferArgos2DFromLocation({ search: '?view=cesium', hash: '' }),
    false,
  );
});

test('formatUtcCoords is presentation-only', () => {
  const text = formatUtcCoords(40.4, -3.7, new Date('2026-11-20T12:00:00Z'));
  assert.match(text, /UTC 12:00:00Z/);
  assert.match(text, /40\.4000°N/);
  assert.match(text, /3\.7000°W/);
});

function fakeDocument() {
  const bodyChildren = [];
  const makeClassList = () => ({
    _v: new Set(),
    add(...values) {
      for (const v of values) this._v.add(v);
    },
    remove(...values) {
      for (const v of values) this._v.delete(v);
    },
    contains(v) {
      return this._v.has(v);
    },
  });
  const body = {
    children: bodyChildren,
    classList: makeClassList(),
    appendChild(node) {
      bodyChildren.push(node);
      node.parent = body;
      return node;
    },
  };
  const documentElement = {
    classList: makeClassList(),
  };
  const documentRef = {
    body,
    documentElement,
    getElementById() {
      return {
        style: {},
        setAttribute() {},
      };
    },
    createElement(tag) {
      const node = {
        tagName: String(tag).toUpperCase(),
        children: [],
        classList: {
          _v: new Set(),
          add(v) {
            this._v.add(v);
          },
          remove(v) {
            this._v.delete(v);
          },
          toggle(v) {
            if (this._v.has(v)) this._v.delete(v);
            else this._v.add(v);
            return this._v.has(v);
          },
          contains(v) {
            return this._v.has(v);
          },
        },
        style: {},
        dataset: {},
        attributes: new Map(),
        hidden: false,
        textContent: '',
        innerHTML: '',
        setAttribute(k, v) {
          this.attributes.set(k, String(v));
        },
        getAttribute(k) {
          return this.attributes.get(k) ?? null;
        },
        appendChild(child) {
          this.children.push(child);
          child.parent = this;
          return child;
        },
        querySelector(sel) {
          if (sel.startsWith('#')) {
            const id = sel.slice(1);
            const walk = (n) => {
              if (n.id === id) return n;
              for (const c of n.children || []) {
                const hit = walk(c);
                if (hit) return hit;
              }
              return null;
            };
            return walk(this);
          }
          if (sel.startsWith('[data-argos-')) {
            const walk = (n) => {
              const key = sel.slice(1, -1);
              if (
                n.attributes?.has(key) ||
                n.dataset?.[
                  key
                    .replace('data-', '')
                    .replace(/-([a-z])/g, (_, c) => c.toUpperCase())
                ] != null
              )
                return n;
              // Fallback: create stub nodes for required data hooks after innerHTML assign.
              return null;
            };
            return walk(this);
          }
          return null;
        },
        querySelectorAll() {
          return [];
        },
        addEventListener() {},
        removeEventListener() {},
        remove() {
          if (!this.parent) return;
          const list = this.parent.children || bodyChildren;
          const i = list.indexOf(this);
          if (i >= 0) list.splice(i, 1);
          this.parent = null;
        },
      };
      // When shell sets innerHTML, synthesize required nodes.
      Object.defineProperty(node, 'innerHTML', {
        set() {
          const mapHost = documentRef.createElement('div');
          mapHost.id = 'argos-map-host';
          const detail = documentRef.createElement('aside');
          detail.id = 'argos-detail-panel';
          detail.hidden = true;
          detail.querySelector = () => ({ textContent: '', dataset: {} });
          const control = documentRef.createElement('aside');
          control.id = 'argos-control-panel';
          control.classList = node.classList;
          const coords = documentRef.createElement('div');
          coords.setAttribute('data-argos-coords', '');
          coords.textContent = '';
          const toast = documentRef.createElement('div');
          toast.setAttribute('data-argos-toast', '');
          toast.hidden = true;
          const count = documentRef.createElement('span');
          count.setAttribute('data-argos-aircraft-count', '');
          count.textContent = '0';
          const banner = documentRef.createElement('div');
          banner.setAttribute('data-argos-basemap-banner', '');
          banner.hidden = true;
          banner.dataset = { state: 'ready' };
          const bannerLabel = documentRef.createElement('span');
          bannerLabel.setAttribute('data-argos-basemap-label', '');
          bannerLabel.textContent = 'BASEMAP OFFLINE';
          banner.children = [bannerLabel];
          banner.querySelector = (sel) => {
            if (sel === '[data-argos-basemap-label]' || sel === 'span') {
              return bannerLabel;
            }
            return null;
          };
          const aircraftToggle = documentRef.createElement('button');
          aircraftToggle.setAttribute('data-argos-action', 'toggle-aircraft');
          aircraftToggle.classList = {
            toggle() {},
            contains() {
              return false;
            },
          };
          aircraftToggle.setAttribute = () => {};
          const satToggle = documentRef.createElement('button');
          satToggle.setAttribute('data-argos-action', 'sat-toggle');
          satToggle.disabled = false;
          satToggle.classList = {
            _v: new Set(),
            toggle(v, force) {
              if (force === true) this._v.add(v);
              else if (force === false) this._v.delete(v);
              else if (this._v.has(v)) this._v.delete(v);
              else this._v.add(v);
            },
            contains(v) {
              return this._v.has(v);
            },
          };
          const satState = documentRef.createElement('span');
          satState.setAttribute('data-argos-sat-state', '');
          satState.textContent = '3D';
          const satCount = documentRef.createElement('span');
          satCount.setAttribute('data-argos-sat-count', '');
          satCount.textContent = '—';
          const satControls = documentRef.createElement('div');
          satControls.setAttribute('data-argos-sat-controls', '');
          satControls.hidden = true;
          satControls.querySelectorAll = () => [];
          const satOrbits = documentRef.createElement('input');
          satOrbits.setAttribute('data-argos-sat-orbits', '');
          satOrbits.setAttribute('data-argos-action', 'sat-orbits');
          satOrbits.checked = true;
          const satCatalog = documentRef.createElement('select');
          satCatalog.setAttribute('data-argos-sat-catalog', '');
          satCatalog.setAttribute('data-argos-action', 'sat-catalog');
          satCatalog.value = 'core';
          const satNorad = documentRef.createElement('input');
          satNorad.setAttribute('data-argos-sat-norad', '');
          satNorad.value = '';
          const searchInput = documentRef.createElement('input');
          searchInput.id = 'argos-search-input';
          searchInput.value = '';
          searchInput.addEventListener = () => {};
          searchInput.removeEventListener = () => {};
          searchInput.setAttribute = (k, v) =>
            searchInput.attributes.set(k, String(v));
          searchInput.removeAttribute = (k) => searchInput.attributes.delete(k);
          searchInput.blur = () => {};
          const searchResults = documentRef.createElement('ul');
          searchResults.id = 'argos-search-results';
          searchResults.hidden = true;
          searchResults.replaceChildren = () => {
            searchResults.children = [];
          };
          searchResults.addEventListener = () => {};
          searchResults.removeEventListener = () => {};
          control.classList.add('is-collapsed');
          node.children = [
            mapHost,
            detail,
            control,
            banner,
            coords,
            toast,
            count,
            aircraftToggle,
            satToggle,
            satControls,
            satOrbits,
            satCatalog,
            satNorad,
            satState,
            satCount,
            searchInput,
            searchResults,
          ];
          node.querySelector = (sel) => {
            if (sel === '#argos-map-host') return mapHost;
            if (sel === '#argos-detail-panel') return detail;
            if (sel === '#argos-control-panel') return control;
            if (sel === '#argos-search-input') return searchInput;
            if (sel === '#argos-search-results') return searchResults;
            if (sel === '[data-argos-coords]') return coords;
            if (sel === '[data-argos-toast]') return toast;
            if (sel === '[data-argos-aircraft-count]') return count;
            if (sel === '[data-argos-basemap-banner]') return banner;
            if (sel === '[data-argos-action="toggle-aircraft"]')
              return aircraftToggle;
            if (sel === '[data-argos-action="sat-toggle"]') return satToggle;
            if (sel === '[data-argos-sat-controls]') return satControls;
            if (sel === '[data-argos-sat-orbits]') return satOrbits;
            if (sel === '[data-argos-sat-catalog]') return satCatalog;
            if (sel === '[data-argos-sat-norad]') return satNorad;
            if (sel === '[data-argos-sat-count]') return satCount;
            if (sel === '[data-argos-sat-state]') return satState;
            if (sel.startsWith('[data-argos-detail')) {
              return { textContent: '', dataset: {} };
            }
            if (sel.startsWith('[data-argos-action')) return null;
            return null;
          };
          node.querySelectorAll = (sel) => {
            if (sel === '[data-argos-action="toggle-filters"]') {
              const btn = documentRef.createElement('button');
              btn.setAttribute('aria-expanded', 'false');
              return [btn];
            }
            return [];
          };
        },
        get() {
          return '';
        },
      });
      return node;
    },
  };
  return documentRef;
}

class FakePresenter {
  constructor(container, { onSelect, onBasemapState } = {}) {
    this.container = container;
    this.onSelect = onSelect;
    this.onBasemapState = onBasemapState;
    this.mounted = 0;
    this.destroyed = 0;
    this.aircraft = null;
    this.selectedId = null;
    this.aircraftVisible = true;
    this.mountOpts = null;
    this.cameraMoves = 0;
    this.map = {
      getCenter: () => ({
        lat: this._centerLat ?? this.mountOpts?.center?.[1] ?? DEFAULT_MAP_CENTER[1],
        lng: this._centerLon ?? this.mountOpts?.center?.[0] ?? DEFAULT_MAP_CENTER[0],
      }),
      getZoom: () => this._zoom ?? this.mountOpts?.zoom ?? DEFAULT_MAP_ZOOM,
    };
  }
  async mount(opts = {}) {
    this.mountOpts = opts;
    this._centerLon = opts.center?.[0];
    this._centerLat = opts.center?.[1];
    this._zoom = opts.zoom;
    this.mounted += 1;
    this.onBasemapState?.('ready');
    return this.map;
  }
  /** Test helper: simulate operator pan/zoom after mount. */
  simulateView(lon, lat, zoom) {
    this._centerLon = lon;
    this._centerLat = lat;
    this._zoom = zoom;
  }
  setAircraft(record, { moveCamera = false } = {}) {
    this.aircraft = record;
    if (record && moveCamera) this.cameraMoves += 1;
  }
  setAircraftVisible(visible) {
    this.aircraftVisible = Boolean(visible);
  }
  select(id) {
    this.selectedId = id;
    this.onSelect?.(id);
  }
  flyTo() {
    this.flew = true;
  }
  async retryBasemap() {
    this.onBasemapState?.('ready');
    return true;
  }
  destroy() {
    this.destroyed += 1;
  }
}

test('P4: 2D→3D→2D does not multiply poll owners; presenter remounts cleanly', async () => {
  const documentRef = fakeDocument();
  const mode = new ArgosAtlasMode({
    documentRef,
    Presenter: FakePresenter,
    autoAttach: true,
    preferArgos2D: false,
  });
  assert.equal(mode.pollOwners, 0);
  await mode.setMode('argos-2d');
  assert.equal(mode.mode, 'argos-2d');
  assert.equal(mode.pollOwners, 0);
  assert.equal(mode.subscriptionOwners, 1);
  const first = mode._presenter;
  assert.equal(first.mounted, 1);
  await mode.setMode('cesium-3d');
  assert.equal(first.destroyed, 1);
  assert.equal(mode.subscriptionOwners, 0);
  await mode.setMode('argos-2d');
  assert.equal(mode.subscriptionOwners, 1);
  assert.equal(mode.pollOwners, 0);
  assert.notEqual(mode._presenter, first);
  assert.equal(mode._presenter.mounted, 1);
  mode.destroy();
  assert.equal(mode.pollOwners, 0);
  assert.equal(mode.subscriptionOwners, 0);
});

test('R18: 3D keeps shared shell visible and marks unified presentation', async () => {
  const documentRef = fakeDocument();
  const mode = new ArgosAtlasMode({
    documentRef,
    Presenter: FakePresenter,
    autoAttach: true,
    preferArgos2D: false,
  });
  assert.equal(mode.mode, 'cesium-3d');
  assert.equal(mode._shell.root.hidden, false);
  assert.equal(mode._shell.root.dataset.mode, 'cesium-3d');
  assert.equal(documentRef.body.classList.contains('argos-atlas-active'), true);
  assert.equal(documentRef.body.classList.contains('argos-atlas-3d'), true);
  assert.equal(mode._modeToggle?.hidden, true);
  await mode.setMode('argos-2d');
  assert.equal(documentRef.body.classList.contains('argos-atlas-3d'), false);
  assert.equal(documentRef.body.classList.contains('argos-atlas-active'), true);
  assert.equal(mode._shell.root.hidden, false);
  mode.destroy();
});

test('R18: Dark/Satellite from 3D returns to 2D with shared header', async () => {
  const documentRef = fakeDocument();
  const mode = new ArgosAtlasMode({
    documentRef,
    Presenter: FakePresenter,
    autoAttach: true,
    preferArgos2D: false,
  });
  assert.equal(mode.mode, 'cesium-3d');
  await mode._setBasemapMode('dark-vector');
  assert.equal(mode.mode, 'argos-2d');
  assert.equal(mode._shell.root.hidden, false);
  assert.equal(documentRef.body.classList.contains('argos-atlas-active'), true);
  assert.equal(documentRef.body.classList.contains('argos-atlas-3d'), false);
  mode.destroy();
});

test('P2/H3: showDemoAircraft labels DEMO and never LIVE', async () => {
  const documentRef = fakeDocument();
  const mode = new ArgosAtlasMode({
    documentRef,
    Presenter: FakePresenter,
    autoAttach: true,
  });
  const record = await mode.showDemoAircraft();
  assert.equal(record.status, 'DEMO');
  assert.equal(record.provenance, 'DEMO');
  assert.equal(mode._presenter.selectedId, 'ae07f6');
  mode.destroy();
});

test('R08 startup: filters collapsed and aircraft not auto-selected', async () => {
  const documentRef = fakeDocument();
  const mode = new ArgosAtlasMode({
    documentRef,
    Presenter: FakePresenter,
    autoAttach: true,
    preferArgos2D: false,
  });
  await mode.setMode('argos-2d');
  assert.equal(
    mode._shell.controlPanel.classList.contains('is-collapsed'),
    true,
  );
  assert.equal(mode._shell.detailPanel.hidden, true);
  assert.equal(mode._presenter.selectedId, null);
  assert.ok(mode._presenter.aircraft);
  assert.equal(mode._presenter.aircraft.id, 'ae07f6');
  mode.destroy();
});

test('R17: mount opens over Huntington Beach; fixture load does not move camera', async () => {
  const documentRef = fakeDocument();
  const mode = new ArgosAtlasMode({
    documentRef,
    Presenter: FakePresenter,
    autoAttach: true,
    preferArgos2D: false,
  });
  await mode.setMode('argos-2d');
  assert.deepEqual(mode._presenter.mountOpts.center, [...DEFAULT_MAP_CENTER]);
  assert.equal(mode._presenter.mountOpts.zoom, DEFAULT_MAP_ZOOM);
  assert.equal(mode._presenter.mountOpts.bearing, 0);
  assert.equal(mode._presenter.mountOpts.pitch, 0);
  assert.equal(mode._presenter.cameraMoves, 0);
  assert.equal(mode._presenter.aircraft.id, DEMO_AIRCRAFT_FIXTURE.id);
  assert.equal(mode._presenter.aircraft.lat, DEMO_AIRCRAFT_FIXTURE.lat);
  assert.equal(mode._presenter.aircraft.lon, DEMO_AIRCRAFT_FIXTURE.lon);
  mode.destroy();
});

test('R19-3: zoom↔height helpers are comparable', () => {
  const z = 11.5;
  const h = heightFromZoom(z);
  assert.ok(h > 400);
  const back = zoomFromHeight(h);
  assert.ok(Math.abs(back - z) < 0.05);
});

test('R19-3: 2D→3D→2D preserves geographical handoff focus', async () => {
  const setViews = [];
  const documentRef = fakeDocument();
  const viewer = {
    trackedEntity: null,
    camera: {
      cancelFlight() {
        this.cancelled = true;
      },
      setView(opts) {
        setViews.push(opts);
      },
      flyTo() {},
      positionCartographic: {
        longitude: (-118.25 * Math.PI) / 180,
        latitude: (34.05 * Math.PI) / 180,
        height: heightFromZoom(13),
      },
    },
  };
  const Cesium = {
    Cartesian3: {
      fromDegrees(lon, lat, height) {
        return { lon, lat, height };
      },
    },
  };
  const mode = new ArgosAtlasMode({
    documentRef,
    Presenter: FakePresenter,
    autoAttach: true,
    preferArgos2D: false,
    viewer,
    cesium: Cesium,
  });
  await mode.setMode('argos-2d');
  mode._presenter.simulateView(-118.25, 34.05, 13);
  await mode.setMode('cesium-3d');
  assert.equal(mode._handoffView.lon, -118.25);
  assert.equal(mode._handoffView.lat, 34.05);
  assert.equal(mode._handoffView.zoom, 13);
  assert.equal(setViews.length, 1);
  assert.equal(setViews[0].destination.lon, -118.25);
  assert.equal(setViews[0].destination.lat, 34.05);
  await mode.setMode('argos-2d');
  assert.deepEqual(mode._presenter.mountOpts.center, [-118.25, 34.05]);
  assert.ok(Math.abs(mode._presenter.mountOpts.zoom - 13) < 0.05);
  mode.destroy();
});

test('R19-3: tracked Cesium camera ownership skips handoff apply', async () => {
  const setViews = [];
  const documentRef = fakeDocument();
  const viewer = {
    trackedEntity: { id: 'sat-25544' },
    camera: {
      cancelFlight() {},
      setView(opts) {
        setViews.push(opts);
      },
      positionCartographic: null,
    },
  };
  const mode = new ArgosAtlasMode({
    documentRef,
    Presenter: FakePresenter,
    autoAttach: true,
    preferArgos2D: false,
    viewer,
    cesium: {
      Cartesian3: {
        fromDegrees(lon, lat, height) {
          return { lon, lat, height };
        },
      },
    },
  });
  await mode.setMode('argos-2d');
  mode._presenter.simulateView(-117.9, 33.7, 12);
  await mode.setMode('cesium-3d');
  assert.equal(setViews.length, 0);
  mode.destroy();
});

test('R19-3: Layers satellite controls bridge DataLayerManager without a second poller', async () => {
  const documentRef = fakeDocument();
  const calls = [];
  const layerMod = {
    getParams: () => ({
      catalog: 'core',
      showPoints: true,
      showOrbits: true,
      selectedSatTrackingId: null,
    }),
    getTrackedInfo: () => null,
  };
  const dataManager = {
    layers: new Map([['satellites', { module: layerMod }]]),
    isEnabled: () => false,
    setEnabled: async (id, enabled, opts) => {
      calls.push(['setEnabled', id, enabled, opts?.origin]);
      dataManager._enabled = enabled;
    },
    setLayerParams: async (id, params, opts) => {
      calls.push(['setLayerParams', id, params, opts?.origin]);
    },
    subscribe: () => () => {},
    _enabled: false,
  };
  dataManager.isEnabled = () => dataManager._enabled;

  const mode = new ArgosAtlasMode({
    documentRef,
    Presenter: FakePresenter,
    autoAttach: true,
    preferArgos2D: false,
    dataManager,
  });
  assert.equal(mode._shell.satToggle.disabled, false);
  assert.match(mode._shell.satStateEl.textContent, /OFF|ON/);
  await mode._toggleSatellites();
  assert.deepEqual(calls[0], ['setEnabled', 'satellites', true, 'user']);
  assert.equal(mode._shell.satControls.hidden, false);
  await mode._setSatelliteParams({ showOrbits: false });
  assert.equal(calls[1][0], 'setLayerParams');
  assert.equal(calls[1][2].showOrbits, false);
  await mode.setMode('argos-2d');
  assert.equal(mode._shell.satToggle.disabled, true);
  assert.equal(mode._shell.satStateEl.textContent, '3D ONLY');
  assert.equal(mode.pollOwners, 0);
  mode.destroy();
});

test('R19-3: setSatelliteControls marks missing layer unavailable', () => {
  const documentRef = fakeDocument();
  const mode = new ArgosAtlasMode({
    documentRef,
    Presenter: FakePresenter,
    autoAttach: true,
    preferArgos2D: false,
  });
  setSatelliteControls(mode._shell, {
    available: false,
    rendererOk: true,
    enabled: false,
  });
  assert.equal(mode._shell.satToggle.disabled, true);
  assert.equal(mode._shell.satStateEl.textContent, 'UNAVAILABLE');
  mode.destroy();
});

test('R15: basemap banner distinguishes offline vs limited-coverage', () => {
  const label = { textContent: '' };
  const banner = {
    hidden: true,
    dataset: {},
    querySelector: (sel) =>
      sel === '[data-argos-basemap-label]' || sel === 'span' ? label : null,
  };
  const shell = { basemapBanner: banner };

  setBasemapBanner(shell, 'ready');
  assert.equal(banner.hidden, true);

  setBasemapBanner(shell, 'limited-coverage');
  assert.equal(banner.hidden, false);
  assert.equal(banner.dataset.state, 'limited-coverage');
  assert.match(label.textContent, /PHOTOGRAPHIC DETAIL LIMITED/);

  setBasemapBanner(shell, 'limited-detail');
  assert.equal(banner.hidden, false);
  assert.equal(banner.dataset.state, 'limited-coverage');
  assert.match(label.textContent, /STREAMED STREET DETAIL/);

  setBasemapBanner(shell, 'offline');
  assert.equal(banner.hidden, false);
  assert.equal(banner.dataset.state, 'offline');
  assert.equal(label.textContent, 'BASEMAP OFFLINE');

  setBasemapBanner(shell, 'satellite-unavailable');
  assert.equal(banner.hidden, true);

  setBasemapBanner(shell, false);
  assert.equal(banner.hidden, true);
});
