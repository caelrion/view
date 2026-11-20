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

    if (autoAttach) documentRef.body.appendChild(this._shell.root);
    bindArgosShellActions(this._shell.root, {
      'toggle-filters': () => this._toggleFilters(),
      'toggle-3d': () => void this.setMode('cesium-3d'),
      'close-detail': () => this._clearSelection(),
      'toggle-aircraft': () => this._toggleAircraftLayer(),
      'retry-basemap': () => void this._retryBasemap(),
    });

    if (autoAttach) this._injectModeToggle();
    // Hide Cesium immediately when 2D is default so the globe never flashes.
    if (preferArgos2D) {
      this._document.body.classList.add('argos-atlas-active', 'argos-atlas-booting');
      this._shell.root.hidden = false;
      this._shell.root.dataset.mode = 'argos-2d';
      this._showCesium(false);
      this._pauseCesium(true);
      // Desktop: open slim rail; mobile: keep collapsed so map stays reachable.
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
          if (msg.startsWith('MAP_TILE_OR_GLYPH:')) return;
          this._toast(msg);
        },
        onBasemapState: (state) => {
          setBasemapBanner(this._shell, state === 'offline');
        },
      });
      // Presenter lifecycle only — not a feed subscription owner.
      this._subscriptionOwners = 1;
    }

    try {
      await this._presenter.mount({
        center: [DEMO_AIRCRAFT_FIXTURE.lon, DEMO_AIRCRAFT_FIXTURE.lat],
        zoom: 5.2,
      });
      this._presenter.resize?.();
    } catch (err) {
      this._error = err instanceof Error ? err : new Error(String(err));
      this._toast(`Map unavailable: ${this._error.message}`);
      this._enter3D();
      return;
    }

    const projection = this._resolveAircraft();
    this._record = projection.record;
    this._presenter.setAircraft(this._record);
    if (this._record) {
      this._presenter.select(this._record.id);
      renderAircraftDetail(this._shell, this._record);
      this._shell.aircraftCountEl.textContent = '1';
    }
    if (projection.contract === 'BACKEND_CONTRACT_PENDING') {
      this._toast(BACKEND_CONTRACT_PENDING.message);
    }
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
    setBasemapBanner(this._shell, false);
    // Tear down MapLibre handlers; do not create/destroy feed owners.
    if (this._presenter) {
      this._presenter.destroy();
      this._presenter = null;
      this._subscriptionOwners = 0;
    }
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
    renderAircraftDetail(this._shell, this._record);
  }

  _clearSelection() {
    this._presenter?.select(null);
    renderAircraftDetail(this._shell, null);
    this._shell.mapHost?.focus?.();
  }

  _applyInitialFilterState() {
    const narrow =
      typeof globalThis.matchMedia === 'function' &&
      globalThis.matchMedia('(max-width: 720px)').matches;
    this._setFiltersExpanded(!narrow);
  }

  _setFiltersExpanded(expanded) {
    this._shell.controlPanel.classList.toggle('is-collapsed', !expanded);
    this._shell.root
      .querySelectorAll('[data-argos-action="toggle-filters"]')
      .forEach((btn) => btn.setAttribute('aria-expanded', String(expanded)));
  }

  _toggleFilters() {
    const expanded = this._shell.controlPanel.classList.contains('is-collapsed');
    this._setFiltersExpanded(expanded);
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
    if (!next) renderAircraftDetail(this._shell, null);
    else if (this._record) {
      this._presenter?.select(this._record.id);
      renderAircraftDetail(this._shell, this._record);
    }
  }

  async _retryBasemap() {
    const ok = await this._presenter?.retryBasemap?.();
    if (ok) this._toast('Basemap restored');
  }

  _showCesium(visible) {
    if (!this._cesiumContainer) return;
    this._cesiumContainer.style.visibility = visible ? 'visible' : 'hidden';
    this._cesiumContainer.style.opacity = visible ? '1' : '0';
    this._cesiumContainer.style.pointerEvents = visible ? '' : 'none';
    this._cesiumContainer.setAttribute(
      'aria-hidden',
      visible ? 'false' : 'true',
    );
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
      void this.setMode(
        this._mode === 'argos-2d' ? 'cesium-3d' : 'argos-2d',
      );
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
