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
} from './shell.js';
import { searchLocal } from './localSearch.js';
import {
  DEFAULT_MAP_CENTER,
  DEFAULT_MAP_ZOOM,
} from '../../maps/maplibre2d/style.js';

async function ensureMapLibreCss() {
  try {
    // Vite handles package CSS; Node unit tests reject the extension and continue.
    await import('maplibre-gl/dist/maplibre-gl.css');
  } catch {
    /* ignore in non-bundler environments */
  }
}

export class ArgosAtlasMode {
  /**
   * @param {{
   *   viewer?: import('cesium').Viewer | null,
   *   cesiumContainer?: HTMLElement | null,
   *   documentRef?: Document,
   *   preferArgos2D?: boolean,
   *   aircraftProjection?: (() => unknown) | null,
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
  } = {}) {
    this._viewer = viewer;
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

    if (autoAttach) documentRef.body.appendChild(this._shell.root);
    bindArgosShellActions(this._shell.root, {
      'toggle-filters': () => this._toggleFilters(),
      'toggle-3d': () => void this.setMode('cesium-3d'),
      'close-detail': () => this._clearSelection(),
      'toggle-aircraft': () => this._toggleAircraftLayer(),
      'retry-basemap': () => void this._retryBasemap(),
    });
    this._bindSearch();
    this._shell.root.addEventListener('keydown', this._onShellKeyDown);

    if (autoAttach) this._injectModeToggle();
    // Hide Cesium immediately when 2D is default so the globe never flashes.
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
    }
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
    this._stopCoords();
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
    await ensureMapLibreCss();
    this._mode = 'argos-2d';
    this._shell.root.hidden = false;
    this._shell.root.dataset.mode = 'argos-2d';
    this._document.documentElement?.classList?.add?.('argos-default-2d');
    this._document.body.classList.add('argos-atlas-active');
    this._showCesium(false);
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
      // Fresh visit opens over Los Angeles — not the DEMO aircraft corridor.
      await this._presenter.mount({
        center: [...DEFAULT_MAP_CENTER],
        zoom: DEFAULT_MAP_ZOOM,
        bearing: 0,
        pitch: 0,
      });
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

  _enter3D() {
    this._mode = 'cesium-3d';
    this._shell.root.hidden = true;
    this._shell.root.dataset.mode = 'cesium-3d';
    this._document.documentElement?.classList?.remove?.('argos-default-2d');
    this._document.body.classList.remove(
      'argos-atlas-active',
      'argos-atlas-booting',
    );
    this._showCesium(true);
    if (this._modeToggle) {
      this._modeToggle.classList.remove('is-active');
      this._modeToggle.textContent = '2D Map';
      this._modeToggle.hidden = false;
    }
    this._stopCoords();
    setBasemapBanner(this._shell, 'ready');
    // Tear down MapLibre handlers; do not create/destroy feed owners.
    if (this._presenter) {
      this._presenter.destroy();
      this._presenter = null;
      this._subscriptionOwners = 0;
    }
    if (typeof globalThis !== 'undefined') globalThis.__argosMap = null;
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
    this._presenter?.flyTo?.({
      lon: item.lon,
      lat: item.lat,
      zoom: item.zoom ?? 8,
    });
    if (item.kind === 'aircraft' && item.aircraftId) {
      this._presenter?.select(item.aircraftId);
      renderAircraftDetail(this._shell, this._record);
    }
    this._closeSearchPanel({ clearInput: false });
    this._shell.mapHost?.focus?.();
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
