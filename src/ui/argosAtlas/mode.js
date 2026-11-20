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
    this._mode = 'cesium-3d';
    this._record = null;
    this._coordsTimer = null;
    this._destroyed = false;
    this._subscriptionOwners = 0;
    this._pollOwners = 0;
    this._error = null;

    if (autoAttach) documentRef.body.appendChild(this._shell.root);
    bindArgosShellActions(this._shell.root, {
      'toggle-filters': () => this._toggleFilters(),
      'toggle-3d': () => void this.setMode('cesium-3d'),
      'close-detail': () => this._clearSelection(),
    });

    if (autoAttach) this._injectModeToggle();
    if (preferArgos2D) void this.setMode('argos-2d');
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
    this._document.body.classList.add('argos-atlas-active');
    this._showCesium(false);
    this._modeToggle?.classList.add('is-active');
    this._modeToggle && (this._modeToggle.textContent = '3D Globe');

    if (!this._presenter) {
      this._presenter = new this._Presenter(this._shell.mapHost, {
        onSelect: (id) => this._onSelect(id),
        onError: (err) => {
          this._error = err;
          this._toast(String(err.message || err));
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
    // Ensure no incidental Cesium render loop thrash while hidden.
    try {
      this._viewer?.scene?.requestRenderMode !== undefined &&
        (this._viewer.scene.requestRenderMode = true);
    } catch {
      /* ignore */
    }
  }

  _enter3D() {
    this._mode = 'cesium-3d';
    this._shell.root.hidden = true;
    this._shell.root.dataset.mode = 'cesium-3d';
    this._document.body.classList.remove('argos-atlas-active');
    this._showCesium(true);
    this._modeToggle?.classList.remove('is-active');
    this._modeToggle && (this._modeToggle.textContent = '2D Map');
    this._stopCoords();
    // Tear down MapLibre handlers; do not create/destroy feed owners.
    if (this._presenter) {
      this._presenter.destroy();
      this._presenter = null;
      this._subscriptionOwners = 0;
    }
    try {
      this._viewer?.resize?.();
      this._viewer?.scene?.requestRender?.();
    } catch {
      /* ignore */
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
  }

  _toggleFilters() {
    this._shell.controlPanel.classList.toggle('is-collapsed');
    const expanded = !this._shell.controlPanel.classList.contains(
      'is-collapsed',
    );
    this._shell.root
      .querySelectorAll('[data-argos-action="toggle-filters"]')
      .forEach((btn) => btn.setAttribute('aria-expanded', String(expanded)));
  }

  _showCesium(visible) {
    if (!this._cesiumContainer) return;
    this._cesiumContainer.style.visibility = visible ? '' : 'hidden';
    this._cesiumContainer.style.pointerEvents = visible ? '' : 'none';
  }

  _injectModeToggle() {
    const btn = this._document.createElement('button');
    btn.type = 'button';
    btn.id = 'argos-mode-toggle';
    btn.className = 'argos-mode-toggle';
    btn.textContent = '2D Map';
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

export function preferArgos2DFromLocation(locationRef = window.location) {
  try {
    const params = new URLSearchParams(locationRef.search || '');
    if (params.get('view') === 'argos-2d' || params.get('map') === '2d')
      return true;
    if ((locationRef.hash || '').includes('view=argos-2d')) return true;
  } catch {
    /* ignore */
  }
  return false;
}
