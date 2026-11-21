/**
 * Argos-standard 2D mode controller.
 *
 * Switches presentation between MapLibre 2D shell and incumbent Cesium 3D
 * without creating a second data/ingestion owner. Aircraft comes from a DEMO
 * fixture or an injected projection callback — never a new poller.
 */
import { MapLibre2DPresenter } from '../../maps/maplibre2d/presenter.js';
import { toAircraftDisplayRecord } from '../../presentation/aircraftDisplayRecord.js';
import {
  DEMO_AIRCRAFT_FIXTURE,
  BACKEND_CONTRACT_PENDING,
} from '../../presentation/demoAircraftFixture.js';
import {
  createArgosAtlasShell,
  bindArgosShellActions,
  renderAircraftDetail,
  formatUtcCoords,
  setBasemapBanner,
  setBasemapToggle,
  setSatelliteControls,
} from './shell.js';
import { searchLocal } from './localSearch.js';
import {
  DEFAULT_MAP_CENTER,
  DEFAULT_MAP_ZOOM,
  BASEMAP_MODE_DARK,
  BASEMAP_MODE_SATELLITE,
  BASEMAP_MODE_STORAGE_KEY,
} from '../../maps/maplibre2d/style.js';

async function ensureMapLibreCss() {
  try {
    // Vite handles package CSS; Node unit tests reject the extension and continue.
    await import('maplibre-gl/dist/maplibre-gl.css');
  } catch {
    /* ignore in non-bundler environments */
  }
}

/** MapLibre zoom → approximate Cesium camera height (meters). */
export function heightFromZoom(zoom) {
  const z = Number(zoom);
  return Number.isFinite(z)
    ? Math.max(400, 4e7 / 2 ** Math.min(Math.max(z, 1), 18))
    : 2e6;
}

/** Cesium camera height (meters) → comparable MapLibre zoom. */
export function zoomFromHeight(heightM) {
  const h = Math.max(400, Number(heightM) || 2e6);
  return Math.min(18, Math.max(1, Math.log2(4e7 / h)));
}

export class ArgosAtlasMode {
  /**
   * @param {{
   *   viewer?: import('cesium').Viewer | null,
   *   cesiumContainer?: HTMLElement | null,
   *   documentRef?: Document,
   *   preferArgos2D?: boolean,
   *   aircraftProjection?: (() => unknown) | null,
   *   dataManager?: { setEnabled?: Function, setLayerParams?: Function, isEnabled?: Function, layers?: Map, subscribe?: Function } | null,
   * }} options
   */
  constructor({
    viewer = null,
    cesiumContainer = null,
    documentRef = document,
    preferArgos2D = false,
    aircraftProjection = null,
    Presenter = MapLibre2DPresenter,
    autoAttach = true,
    cesium = null,
    dataManager = null,
  } = {}) {
    this._viewer = viewer;
    this._cesium = cesium;
    this._cesiumContainer =
      cesiumContainer || documentRef.getElementById?.('cesiumContainer');
    this._document = documentRef;
    this._aircraftProjection = aircraftProjection;
    this._Presenter = Presenter;
    this._shell = createArgosAtlasShell(documentRef);
    this._presenter = null;
    this._mode = preferArgos2D ? 'argos-2d' : 'cesium-3d';
    this._record = null;
    this._coordsTimer = null;
    this._destroyed = false;
    this._subscriptionOwners = 0;
    this._pollOwners = 0;
    this._error = null;
    this._preferArgos2D = preferArgos2D;
    this._searchResults = [];
    this._searchActiveIndex = -1;
    this._filtersFocusReturn = null;
    this._detailFocusReturn = null;
    this._onShellKeyDown = (event) => this._handleShellKeyDown(event);
    /** @type {{ lon: number, lat: number, zoom: number } | null} */
    this._handoffView = null;
    this._cameraTransitionGen = 0;
    this._dataManager = null;
    this._satUnsub = null;

    if (autoAttach) documentRef.body.appendChild(this._shell.root);
    bindArgosShellActions(this._shell.root, {
      'toggle-filters': () => this._toggleFilters(),
      'toggle-3d': () => void this.setMode('cesium-3d'),
      'close-detail': () => this._clearSelection(),
      'toggle-aircraft': () => this._toggleAircraftLayer(),
      'retry-basemap': () => void this._retryBasemap(),
      'basemap-dark': () => void this._setBasemapMode(BASEMAP_MODE_DARK),
      'basemap-satellite': () =>
        void this._setBasemapMode(BASEMAP_MODE_SATELLITE),
      'sat-toggle': () => void this._toggleSatellites(),
      'sat-orbits': (_e, el) =>
        void this._setSatelliteParams({ showOrbits: Boolean(el?.checked) }),
      'sat-catalog': (_e, el) =>
        void this._setSatelliteParams({
          catalog: el?.value === 'dense' ? 'dense' : 'core',
        }),
      'sat-follow': () => void this._followSatelliteFromInput(),
      'sat-stop': () => void this._stopSatelliteTracking(),
    });
    this._bindSearch();
    this._shell.root.addEventListener('keydown', this._onShellKeyDown);
    if (dataManager) this.attachDataManager(dataManager);
    else this._syncSatelliteControls();

    if (autoAttach) this._injectModeToggle();
    // Hide Cesium immediately when 2D is default so the globe never flashes.
    // Direct ?view=3d keeps the shared Caelrion header — never expose legacy chrome.
    if (preferArgos2D) {
      this._document.body.classList.add(
        'argos-atlas-active',
        'argos-atlas-booting',
      );
      this._shell.root.hidden = false;
      this._shell.root.dataset.mode = 'argos-2d';
      this._showCesium(false);
      this._pauseCesium(true);
      // Startup: every menu closed (filters + detail).
      this._applyInitialFilterState();
      void this.setMode('argos-2d').finally(() => {
        this._document.body.classList.remove('argos-atlas-booting');
      });
    } else if (autoAttach) {
      this._enter3D({ initial: true });
    }
  }

  /**
   * Bridge the shared Layers menu to the incumbent satellites DataLayerManager
   * owner — no second poller, registry, or toolbar.
   * @param {object | null} dataManager
   */
  attachDataManager(dataManager) {
    if (this._satUnsub) {
      try {
        this._satUnsub();
      } catch {
        /* ignore */
      }
      this._satUnsub = null;
    }
    this._dataManager = dataManager || null;
    if (typeof this._dataManager?.subscribe === 'function') {
      this._satUnsub = this._dataManager.subscribe(() => {
        if (!this._destroyed) this._syncSatelliteControls();
      });
    }
    this._syncSatelliteControls();
  }

  get mode() {
    return this._mode;
  }

  get pollOwners() {
    return this._pollOwners;
  }

  get subscriptionOwners() {
    return this._subscriptionOwners;
  }

  get lastError() {
    return this._error;
  }

  get aircraftRecord() {
    return this._record;
  }

  async setMode(mode) {
    if (this._destroyed) return;
    if (mode === 'argos-2d') {
      await this._enter2D();
    } else {
      this._enter3D();
    }
  }

  destroy() {
    this._destroyed = true;
    this._cameraTransitionGen += 1;
    this._stopCoords();
    if (this._satUnsub) {
      try {
        this._satUnsub();
      } catch {
        /* ignore */
      }
      this._satUnsub = null;
    }
    this._dataManager = null;
    this._shell.root.removeEventListener?.('keydown', this._onShellKeyDown);
    this._unbindSearch();
    this._presenter?.destroy();
    this._presenter = null;
    this._shell.root.remove();
    this._modeToggle?.remove();
    this._showCesium(true);
    this._subscriptionOwners = 0;
    this._pollOwners = 0;
  }

  /** Test/helper: force DEMO aircraft onto the map. */
  async showDemoAircraft() {
    await this.setMode('argos-2d');
    const record = toAircraftDisplayRecord(DEMO_AIRCRAFT_FIXTURE);
    this._record = record;
    this._presenter?.setAircraft(record);
    this._presenter?.select(record.id);
    renderAircraftDetail(this._shell, record);
    this._shell.aircraftCountEl.textContent = '1';
    return record;
  }

  async _enter2D() {
    const gen = ++this._cameraTransitionGen;
    // Preserve geographical focus when leaving 3D (unless Cesium tracking owns the camera).
    if (this._mode === 'cesium-3d' && !this._isSatelliteCameraOwned()) {
      const from3d = this._capture3DView();
      if (from3d) this._handoffView = from3d;
    }
    await ensureMapLibreCss();
    if (gen !== this._cameraTransitionGen || this._destroyed) return;
    this._mode = 'argos-2d';
    this._shell.root.hidden = false;
    this._shell.root.dataset.mode = 'argos-2d';
    setBasemapToggle(
      this._shell,
      this._presenter?.basemapMode || this._readStoredBasemapMode(),
    );
    this._document.documentElement?.classList?.add?.('argos-default-2d');
    this._document.body.classList.add('argos-atlas-active');
    this._document.body.classList.remove('argos-atlas-3d');
    this._showCesium(false);
    this._syncSatelliteControls();
    if (this._modeToggle) {
      this._modeToggle.classList.add('is-active');
      this._modeToggle.textContent = '3D Globe';
      this._modeToggle.hidden = true;
    }

    if (!this._presenter) {
      this._presenter = new this._Presenter(this._shell.mapHost, {
        onSelect: (id) => this._onSelect(id),
        onError: (err) => {
          this._error = err;
          const msg = String(err.message || err);
          if (
            msg.startsWith('MAP_TILE_OR_GLYPH:') ||
            msg.startsWith('MAP_IMAGERY_TILE:') ||
            msg.startsWith('MAP_OWNED_BASEMAP_UNAVAILABLE:') ||
            msg.startsWith('MAP_AERIAL_UNAVAILABLE:') ||
            msg.startsWith('MAP_STREAMED_DARK_DETAIL:') ||
            msg.startsWith('MAP_STREAMED_DARK_UNAVAILABLE:') ||
            msg.startsWith('MAP_SATELLITE_UNAVAILABLE:')
          ) {
            return;
          }
          this._toast(msg);
        },
        onBasemapState: (state) => {
          setBasemapBanner(this._shell, state);
        },
      });
      // Presenter lifecycle only — not a feed subscription owner.
      this._subscriptionOwners = 1;
    }

    this._applyInitialFilterState();
    try {
      const basemapMode = this._readStoredBasemapMode();
      setBasemapToggle(this._shell, basemapMode);
      const handoff = this._handoffView;
      // Fresh visit opens over Huntington Beach — not the DEMO aircraft corridor.
      // Mode switches reuse the last shared geographical focus.
      await this._presenter.mount({
        center: handoff ? [handoff.lon, handoff.lat] : [...DEFAULT_MAP_CENTER],
        zoom: handoff?.zoom ?? DEFAULT_MAP_ZOOM,
        bearing: 0,
        pitch: 0,
        basemapMode,
      });
      if (gen !== this._cameraTransitionGen || this._destroyed) return;
      this._presenter.resize?.();
      // QA / diagnostics only — not a feed owner.
      if (typeof globalThis !== 'undefined') {
        globalThis.__argosMap = this._presenter.map || null;
      }
    } catch (err) {
      this._error = err instanceof Error ? err : new Error(String(err));
      this._toast(`Map unavailable: ${this._error.message}`);
      this._enter3D();
      return;
    }

    const projection = this._resolveAircraft();
    this._record = projection.record;
    // Render marker only — do not auto-select, open detail, or move camera.
    this._presenter.setAircraft(this._record);
    this._presenter.select(null);
    renderAircraftDetail(this._shell, null);
    this._shell.aircraftCountEl.textContent = this._record ? '1' : '0';
    this._error =
      projection.contract === 'BACKEND_CONTRACT_PENDING'
        ? new Error(BACKEND_CONTRACT_PENDING.code)
        : this._error;
    this._startCoords();
    this._presenter.resize?.();
  }

  _enter3D({ initial = false } = {}) {
    const gen = ++this._cameraTransitionGen;
    // Capture 2D focus before tearing down MapLibre.
    if (this._mode === 'argos-2d') {
      const from2d = this._capture2DView();
      if (from2d) this._handoffView = from2d;
    }
    this._mode = 'cesium-3d';
    setBasemapToggle(this._shell, 'cesium-3d');
    // Shared Caelrion header stays mounted — do not reveal legacy GEV chrome.
    this._shell.root.hidden = false;
    this._shell.root.dataset.mode = 'cesium-3d';
    this._document.documentElement?.classList?.remove?.('argos-default-2d');
    this._document.body.classList.add('argos-atlas-active', 'argos-atlas-3d');
    this._document.body.classList.remove('argos-atlas-booting');
    this._applyInitialFilterState();
    this._showCesium(true);
    if (this._modeToggle) {
      // Header owns Dark | Satellite | 3D — no floating duplicate.
      this._modeToggle.classList.remove('is-active');
      this._modeToggle.textContent = '2D Map';
      this._modeToggle.hidden = true;
    }
    setBasemapBanner(this._shell, 'ready');
    // Tear down MapLibre handlers; do not create/destroy feed owners.
    if (this._presenter) {
      this._presenter.destroy();
      this._presenter = null;
      this._subscriptionOwners = 0;
    }
    if (typeof globalThis !== 'undefined') globalThis.__argosMap = null;
    this._startCesiumCoords();
    this._syncSatelliteControls();
    // Ordinary 2D→3D transitions preserve focus. Direct ?view=3d startup leaves
    // the incumbent Cesium boot camera (share restore / flyToAustin) alone.
    if (!initial && this._handoffView) {
      this._apply3DHandoff(this._handoffView, gen);
    }
  }

  _capture2DView() {
    const map = this._presenter?.map;
    if (!map?.getCenter) return null;
    const c = map.getCenter();
    const lon = Number(c?.lng);
    const lat = Number(c?.lat);
    const zoom = Number(map.getZoom?.() ?? DEFAULT_MAP_ZOOM);
    if (!Number.isFinite(lon) || !Number.isFinite(lat)) return null;
    return {
      lon,
      lat,
      zoom: Number.isFinite(zoom) ? zoom : DEFAULT_MAP_ZOOM,
    };
  }

  _capture3DView() {
    const carto = this._viewer?.camera?.positionCartographic;
    if (!carto) return null;
    const lat = (Number(carto.latitude) * 180) / Math.PI;
    const lon = (Number(carto.longitude) * 180) / Math.PI;
    const height = Number(carto.height);
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
    return { lon, lat, zoom: zoomFromHeight(height) };
  }

  _isSatelliteCameraOwned() {
    return Boolean(this._viewer?.trackedEntity);
  }

  _cancelCesiumFlight() {
    try {
      this._viewer?.camera?.cancelFlight?.();
    } catch {
      /* ignore */
    }
  }

  _apply3DHandoff(view, gen) {
    if (!view || gen !== this._cameraTransitionGen || this._destroyed) return;
    if (this._isSatelliteCameraOwned()) return;
    const viewer = this._viewer;
    const Cesium = this._cesium || globalThis.Cesium;
    if (!viewer?.camera || !Cesium?.Cartesian3?.fromDegrees) return;
    this._cancelCesiumFlight();
    try {
      viewer.camera.setView({
        destination: Cesium.Cartesian3.fromDegrees(
          Number(view.lon),
          Number(view.lat),
          heightFromZoom(view.zoom),
        ),
      });
    } catch {
      /* ignore navigation failures */
    }
  }

  _satelliteLayerAvailable() {
    return Boolean(this._dataManager?.layers?.has?.('satellites'));
  }

  _syncSatelliteControls() {
    const available = this._satelliteLayerAvailable();
    const rendererOk = this._mode === 'cesium-3d';
    let enabled = false;
    let showOrbits = true;
    let catalog = 'core';
    let trackedNorad = null;
    if (available) {
      try {
        enabled = Boolean(this._dataManager.isEnabled?.('satellites'));
        const mod = this._dataManager.layers.get('satellites')?.module;
        const params = mod?.getParams?.() || {};
        showOrbits = params.showOrbits !== false;
        catalog = params.catalog === 'dense' ? 'dense' : 'core';
        trackedNorad = params.selectedSatTrackingId ?? null;
        const tracked = mod?.getTrackedInfo?.();
        if (tracked?.noradId != null) trackedNorad = tracked.noradId;
      } catch {
        /* ignore stale manager */
      }
    }
    setSatelliteControls(this._shell, {
      available,
      rendererOk,
      enabled,
      showOrbits,
      catalog,
      trackedNorad,
    });
  }

  async _toggleSatellites() {
    if (!this._satelliteLayerAvailable()) {
      this._toast('Satellites unavailable');
      return;
    }
    if (this._mode !== 'cesium-3d') {
      this._toast('Satellites available in 3D only');
      return;
    }
    const next = !this._dataManager.isEnabled('satellites');
    try {
      await this._dataManager.setEnabled('satellites', next, {
        origin: 'user',
      });
    } catch (err) {
      this._toast(`Satellites: ${err?.message || err}`);
    }
    this._syncSatelliteControls();
  }

  async _setSatelliteParams(params) {
    if (!this._satelliteLayerAvailable() || this._mode !== 'cesium-3d') {
      this._syncSatelliteControls();
      return;
    }
    try {
      await this._dataManager.setLayerParams('satellites', params, {
        origin: 'user',
      });
    } catch (err) {
      this._toast(`Satellites: ${err?.message || err}`);
    }
    this._syncSatelliteControls();
  }

  async _followSatelliteFromInput() {
    const raw = this._shell.satNorad?.value;
    const norad = Math.trunc(Number(raw));
    if (!Number.isFinite(norad) || norad <= 0) {
      this._toast('Enter a valid NORAD ID');
      return;
    }
    await this._setSatelliteParams({ selectedSatTrackingId: norad });
  }

  async _stopSatelliteTracking() {
    await this._setSatelliteParams({ selectedSatTrackingId: null });
  }

  _resolveAircraft() {
    if (typeof this._aircraftProjection === 'function') {
      try {
        const raw = this._aircraftProjection();
        if (raw) {
          return {
            record: toAircraftDisplayRecord(raw),
            contract: 'BACKEND',
          };
        }
      } catch (err) {
        this._error = err instanceof Error ? err : new Error(String(err));
      }
    }
    return {
      record: toAircraftDisplayRecord(DEMO_AIRCRAFT_FIXTURE),
      contract: 'BACKEND_CONTRACT_PENDING',
    };
  }

  _onSelect(id) {
    if (!id || !this._record || this._record.id !== id) {
      renderAircraftDetail(this._shell, null);
      return;
    }
    this._detailFocusReturn =
      this._document.activeElement || this._shell.mapHost;
    renderAircraftDetail(this._shell, this._record);
  }

  _clearSelection() {
    this._presenter?.select(null);
    renderAircraftDetail(this._shell, null);
    const returnTo = this._detailFocusReturn;
    this._detailFocusReturn = null;
    if (returnTo?.focus) returnTo.focus();
    else this._shell.mapHost?.focus?.();
  }

  _applyInitialFilterState() {
    // Fresh session: Layers/Filters always start collapsed.
    this._setFiltersExpanded(false);
  }

  _setFiltersExpanded(expanded) {
    if (expanded) this._shell.controlPanel.classList.remove('is-collapsed');
    else this._shell.controlPanel.classList.add('is-collapsed');
    this._shell.root
      .querySelectorAll('[data-argos-action="toggle-filters"]')
      .forEach((btn) => btn.setAttribute('aria-expanded', String(expanded)));
    if (!expanded) {
      const returnTo = this._filtersFocusReturn;
      this._filtersFocusReturn = null;
      if (returnTo?.focus) returnTo.focus();
    }
  }

  _toggleFilters() {
    const collapsed =
      this._shell.controlPanel.classList.contains('is-collapsed');
    if (collapsed) {
      this._filtersFocusReturn =
        this._document.activeElement ||
        this._shell.root.querySelector('[data-argos-action="toggle-filters"]');
    }
    this._setFiltersExpanded(collapsed);
  }

  _toggleAircraftLayer() {
    const next = !(this._presenter?.aircraftVisible ?? true);
    this._presenter?.setAircraftVisible(next);
    const btn = this._shell.aircraftToggle;
    if (btn) {
      btn.classList.toggle('is-active', next);
      btn.setAttribute('aria-pressed', String(next));
    }
    this._shell.aircraftCountEl.textContent = next && this._record ? '1' : '0';
    // Hiding the layer clears selection; showing it again does not auto-open detail.
    if (!next) {
      this._presenter?.select(null);
      renderAircraftDetail(this._shell, null);
    }
  }

  _bindSearch() {
    const input = this._shell.searchInput;
    const list = this._shell.searchResults;
    if (!input || !list) return;
    this._onSearchInput = () => this._runSearch(input.value);
    this._onSearchKeyDown = (event) => this._handleSearchKeyDown(event);
    this._onSearchBlur = () => {
      // Delay so option click can fire first.
      clearTimeout(this._searchBlurTimer);
      this._searchBlurTimer = setTimeout(() => this._closeSearchPanel(), 140);
    };
    this._onSearchFocus = () => {
      if (input.value.trim()) this._runSearch(input.value);
    };
    this._onSearchResultsClick = (event) => {
      const option = event.target.closest?.('[data-search-index]');
      if (!option) return;
      const index = Number(option.getAttribute('data-search-index'));
      if (Number.isInteger(index)) this._selectSearchResult(index);
    };
    input.addEventListener('input', this._onSearchInput);
    input.addEventListener('keydown', this._onSearchKeyDown);
    input.addEventListener('blur', this._onSearchBlur);
    input.addEventListener('focus', this._onSearchFocus);
    list.addEventListener('mousedown', (event) => event.preventDefault());
    list.addEventListener('click', this._onSearchResultsClick);
  }

  _unbindSearch() {
    const input = this._shell.searchInput;
    const list = this._shell.searchResults;
    clearTimeout(this._searchBlurTimer);
    if (input) {
      input.removeEventListener('input', this._onSearchInput);
      input.removeEventListener('keydown', this._onSearchKeyDown);
      input.removeEventListener('blur', this._onSearchBlur);
      input.removeEventListener('focus', this._onSearchFocus);
    }
    if (list && this._onSearchResultsClick) {
      list.removeEventListener('click', this._onSearchResultsClick);
    }
  }

  _runSearch(raw) {
    const { results, emptyMessage } = searchLocal({
      query: raw,
      aircraft: this._record,
      map: this._presenter?.map || null,
    });
    this._searchResults = results;
    this._searchActiveIndex = results.length ? 0 : -1;
    this._renderSearchResults(emptyMessage);
  }

  _renderSearchResults(emptyMessage) {
    const list = this._shell.searchResults;
    const input = this._shell.searchInput;
    if (!list || !input) return;
    list.replaceChildren();
    if (!String(input.value || '').trim()) {
      list.hidden = true;
      input.setAttribute('aria-expanded', 'false');
      return;
    }
    if (!this._searchResults.length) {
      const empty = this._document.createElement('li');
      empty.className = 'argos-search-empty';
      empty.setAttribute('role', 'presentation');
      empty.textContent = emptyMessage || 'No locally available result';
      list.appendChild(empty);
      list.hidden = false;
      input.setAttribute('aria-expanded', 'true');
      return;
    }
    this._searchResults.forEach((item, index) => {
      const li = this._document.createElement('li');
      li.setAttribute('role', 'option');
      li.id = `argos-search-option-${index}`;
      li.setAttribute('data-search-index', String(index));
      li.setAttribute(
        'aria-selected',
        String(index === this._searchActiveIndex),
      );
      const btn = this._document.createElement('button');
      btn.type = 'button';
      btn.className = 'argos-search-option';
      if (index === this._searchActiveIndex) btn.classList.add('is-active');
      btn.setAttribute('data-search-index', String(index));
      const kind = this._document.createElement('span');
      kind.className = 'argos-search-option-kind';
      kind.textContent = item.kind;
      const label = this._document.createElement('span');
      label.textContent = item.label;
      btn.append(kind, label);
      li.appendChild(btn);
      list.appendChild(li);
    });
    list.hidden = false;
    input.setAttribute('aria-expanded', 'true');
    if (this._searchActiveIndex >= 0) {
      input.setAttribute(
        'aria-activedescendant',
        `argos-search-option-${this._searchActiveIndex}`,
      );
    } else {
      input.removeAttribute('aria-activedescendant');
    }
  }

  _setSearchActiveIndex(index) {
    if (!this._searchResults.length) {
      this._searchActiveIndex = -1;
      return;
    }
    const max = this._searchResults.length - 1;
    this._searchActiveIndex = Math.max(0, Math.min(max, index));
    this._renderSearchResults(null);
  }

  _selectSearchResult(index) {
    const item = this._searchResults[index];
    if (!item) return;
    if (this._mode === 'cesium-3d') {
      this._flyCesiumTo(item.lon, item.lat, item.zoom ?? 8);
    } else {
      this._presenter?.flyTo?.({
        lon: item.lon,
        lat: item.lat,
        zoom: item.zoom ?? 8,
      });
      if (item.kind === 'aircraft' && item.aircraftId) {
        this._presenter?.select(item.aircraftId);
        renderAircraftDetail(this._shell, this._record);
      }
    }
    this._closeSearchPanel({ clearInput: false });
    if (this._mode !== 'cesium-3d') this._shell.mapHost?.focus?.();
  }

  /** Route local search hits through the incumbent Cesium camera when in 3D. */
  _flyCesiumTo(lon, lat, zoom = 8) {
    const viewer = this._viewer;
    const Cesium = this._cesium || globalThis.Cesium;
    if (!viewer?.camera || !Cesium?.Cartesian3?.fromDegrees) return;
    if (this._isSatelliteCameraOwned()) return;
    this._cancelCesiumFlight();
    const height = heightFromZoom(zoom);
    try {
      viewer.camera.flyTo({
        destination: Cesium.Cartesian3.fromDegrees(
          Number(lon),
          Number(lat),
          height,
        ),
        duration: 1.6,
      });
      this._handoffView = {
        lon: Number(lon),
        lat: Number(lat),
        zoom: Number(zoom) || 8,
      };
    } catch {
      /* ignore navigation failures */
    }
  }

  _closeSearchPanel({ clearInput = false } = {}) {
    const list = this._shell.searchResults;
    const input = this._shell.searchInput;
    if (clearInput && input) input.value = '';
    this._searchResults = [];
    this._searchActiveIndex = -1;
    if (list) {
      list.replaceChildren();
      list.hidden = true;
    }
    if (input) {
      input.setAttribute('aria-expanded', 'false');
      input.removeAttribute('aria-activedescendant');
    }
  }

  _handleSearchKeyDown(event) {
    const key = event.key;
    if (key === 'Escape') {
      if (!this._shell.searchResults?.hidden) {
        this._closeSearchPanel();
        event.preventDefault();
        event.stopPropagation();
        return;
      }
      event.target.blur?.();
      this._shell.mapHost?.focus?.();
      return;
    }
    if (key === 'ArrowDown') {
      this._setSearchActiveIndex(this._searchActiveIndex + 1);
      event.preventDefault();
      return;
    }
    if (key === 'ArrowUp') {
      this._setSearchActiveIndex(this._searchActiveIndex - 1);
      event.preventDefault();
      return;
    }
    if (key === 'Enter') {
      if (this._searchActiveIndex >= 0) {
        this._selectSearchResult(this._searchActiveIndex);
      } else if (String(this._shell.searchInput?.value || '').trim()) {
        this._runSearch(this._shell.searchInput.value);
        if (this._searchResults.length === 1) {
          this._selectSearchResult(0);
        }
      }
      event.preventDefault();
    }
  }

  _handleShellKeyDown(event) {
    if (event.key !== 'Escape') return;
    const target = event.target;
    if (target === this._shell.searchInput) return;
    if (!this._shell.searchResults?.hidden) {
      this._closeSearchPanel();
      event.preventDefault();
      return;
    }
    if (!this._shell.detailPanel?.hidden) {
      this._clearSelection();
      event.preventDefault();
      return;
    }
    if (!this._shell.controlPanel?.classList.contains('is-collapsed')) {
      this._setFiltersExpanded(false);
      event.preventDefault();
    }
  }

  _readStoredBasemapMode() {
    try {
      const raw = this._document?.defaultView?.localStorage?.getItem?.(
        BASEMAP_MODE_STORAGE_KEY,
      );
      if (raw === BASEMAP_MODE_DARK) return BASEMAP_MODE_DARK;
      if (raw === BASEMAP_MODE_SATELLITE) return BASEMAP_MODE_SATELLITE;
    } catch {
      /* private mode */
    }
    return BASEMAP_MODE_SATELLITE;
  }

  _storeBasemapMode(mode) {
    try {
      this._document?.defaultView?.localStorage?.setItem?.(
        BASEMAP_MODE_STORAGE_KEY,
        mode,
      );
    } catch {
      /* private mode */
    }
  }

  async _setBasemapMode(mode) {
    const next =
      mode === BASEMAP_MODE_DARK ? BASEMAP_MODE_DARK : BASEMAP_MODE_SATELLITE;
    setBasemapToggle(this._shell, next);
    this._storeBasemapMode(next);
    // Dark / Satellite from 3D returns to the shared 2D shell with that basemap.
    if (this._mode === 'cesium-3d') {
      await this.setMode('argos-2d');
      return;
    }
    if (!this._presenter) return;
    const ok = await this._presenter.setBasemapMode(next);
    if (!ok) this._toast('Basemap switch failed');
  }

  async _retryBasemap() {
    const ok = await this._presenter?.retryBasemap?.();
    if (ok) this._toast('Basemap restored');
  }

  _showCesium(visible) {
    if (this._cesiumContainer) {
      this._cesiumContainer.style.visibility = visible ? 'visible' : 'hidden';
      this._cesiumContainer.style.opacity = visible ? '1' : '0';
      this._cesiumContainer.style.pointerEvents = visible ? '' : 'none';
      this._cesiumContainer.setAttribute(
        'aria-hidden',
        visible ? 'false' : 'true',
      );
    }
    // JS-only: never CSS-hide #cesium-credits (creditAttribution gate).
    // MapLibre attribution covers 2D; restore Cesium credits in 3D.
    const credits = this._document.getElementById?.('cesium-credits');
    if (credits) {
      credits.hidden = !visible;
      credits.setAttribute('aria-hidden', visible ? 'false' : 'true');
    }
    this._pauseCesium(!visible);
  }

  _pauseCesium(paused) {
    const viewer = this._viewer;
    if (!viewer?.scene) return;
    try {
      if (paused) {
        viewer.scene.requestRenderMode = true;
        if (typeof viewer.useDefaultRenderLoop === 'boolean') {
          viewer.useDefaultRenderLoop = false;
        }
      } else if (typeof viewer.useDefaultRenderLoop === 'boolean') {
        viewer.useDefaultRenderLoop = true;
        viewer.scene.requestRenderMode = false;
        viewer.resize?.();
        viewer.scene.requestRender?.();
      }
    } catch {
      /* ignore */
    }
  }

  _injectModeToggle() {
    // Floating return control for Cesium 3D only — hidden in 2D to avoid
    // duplicating the header 3D button and covering attribution.
    const btn = this._document.createElement('button');
    btn.type = 'button';
    btn.id = 'argos-mode-toggle';
    btn.className = 'argos-mode-toggle';
    const start2d = this._preferArgos2D;
    btn.textContent = start2d ? '3D Globe' : '2D Map';
    btn.classList.toggle('is-active', start2d);
    btn.hidden = start2d;
    btn.title = 'Toggle Argos-style dark 2D map / Cesium 3D';
    btn.addEventListener('click', () => {
      void this.setMode(this._mode === 'argos-2d' ? 'cesium-3d' : 'argos-2d');
    });
    this._document.body.appendChild(btn);
    this._modeToggle = btn;
  }

  _startCoords() {
    this._stopCoords();
    const tick = () => {
      const center = this._presenter?.map?.getCenter?.();
      this._shell.coordsEl.textContent = formatUtcCoords(
        center?.lat,
        center?.lng,
      );
    };
    tick();
    this._coordsTimer = setInterval(tick, 1000);
    this._coordsTimer?.unref?.();
  }

  _startCesiumCoords() {
    this._stopCoords();
    const tick = () => {
      const carto = this._viewer?.camera?.positionCartographic;
      if (!carto) {
        this._shell.coordsEl.textContent = formatUtcCoords(null, null);
        return;
      }
      const lat = (Number(carto.latitude) * 180) / Math.PI;
      const lon = (Number(carto.longitude) * 180) / Math.PI;
      this._shell.coordsEl.textContent = formatUtcCoords(lat, lon);
    };
    tick();
    this._coordsTimer = setInterval(tick, 1000);
    this._coordsTimer?.unref?.();
  }

  _stopCoords() {
    if (this._coordsTimer) clearInterval(this._coordsTimer);
    this._coordsTimer = null;
  }

  _toast(message) {
    const el = this._shell.toastEl;
    el.textContent = message;
    el.hidden = false;
    clearTimeout(this._toastTimer);
    this._toastTimer = setTimeout(() => {
      el.hidden = true;
    }, 5000);
  }
}

/**
 * Flat MapLibre 2D is the product default at `/`.
 * Opt into Cesium 3D only via explicit query/hash: view=3d | map=3d | view=cesium.
 * Legacy ?view=argos-2d / ?map=2d / #view=argos-2d remain valid and select 2D.
 */
export function preferArgos2DFromLocation(locationRef = window.location) {
  try {
    const params = new URLSearchParams(locationRef.search || '');
    const view = (params.get('view') || '').toLowerCase();
    const map = (params.get('map') || '').toLowerCase();
    const hash = locationRef.hash || '';
    if (
      view === '3d' ||
      view === 'cesium' ||
      map === '3d' ||
      hash.includes('view=3d') ||
      hash.includes('view=cesium') ||
      hash.includes('map=3d')
    ) {
      return false;
    }
    // Default 2D, including bare `/` and legacy Argos-2d deep links.
    return true;
  } catch {
    return true;
  }
}
