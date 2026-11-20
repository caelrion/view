/**
 * Argos-matched standard-map shell chrome (Caelrion branding).
 * Presentation only — no feeds, no backend calls.
 * V1.1: category rail, lighter panels, basemap offline affordance.
 */

export function createArgosAtlasShell(documentRef = document) {
  const root = documentRef.createElement('div');
  root.id = 'argos-atlas-root';
  root.className = 'argos-atlas-root';
  root.hidden = true;
  root.setAttribute('data-mode', 'hidden');
  root.innerHTML = `
    <div id="argos-map-host" class="argos-map-host" role="application" aria-label="Caelrion dark 2D map" tabindex="0"></div>

    <header class="argos-hud" role="banner">
      <div class="argos-hud-brand">
        <img class="argos-hud-logo" src="/logo.svg" alt="" width="24" height="24" />
        <div class="argos-hud-brand-text">
          <div class="argos-hud-title">CAELRION VIEW</div>
          <div class="argos-hud-sub">We never blink.</div>
        </div>
      </div>
      <div class="argos-hud-search" role="search">
        <input
          type="search"
          class="argos-search-input"
          placeholder="Search places, flights, ships…"
          disabled
          aria-disabled="true"
          aria-describedby="argos-search-help"
          title="Search — BACKEND_CONTRACT_PENDING"
        />
        <span class="argos-chip argos-chip-pending" id="argos-search-help">UNAVAILABLE</span>
      </div>
      <div class="argos-hud-right">
        <button type="button" class="argos-hud-btn" data-argos-action="toggle-filters" aria-expanded="false" aria-controls="argos-control-panel" title="Layers">
          <span aria-hidden="true">☰</span><span class="argos-hud-btn-label">Layers</span>
        </button>
        <button type="button" class="argos-hud-btn" data-argos-action="toggle-3d" title="Switch to Cesium 3D globe">3D</button>
      </div>
    </header>

    <aside id="argos-control-panel" class="argos-control-panel is-collapsed" aria-label="Map category rail">
      <div class="argos-cp-head">
        <span>Layers</span>
        <button type="button" class="argos-icon-btn" data-argos-action="toggle-filters" aria-label="Close layers">✕</button>
      </div>
      <nav class="argos-category-rail" aria-label="Map categories">
        <button type="button" class="argos-rail-row is-active" data-argos-action="toggle-aircraft" aria-pressed="true" data-layer="aircraft">
          <span class="argos-rail-icon" aria-hidden="true">✈</span>
          <span class="argos-rail-label">Aircraft</span>
          <span class="argos-rail-meta">
            <span class="argos-layer-count" data-argos-aircraft-count>1</span>
            <span class="argos-rail-state">DEMO</span>
          </span>
        </button>
        <button type="button" class="argos-rail-row is-disabled" disabled aria-disabled="true" data-layer="ships">
          <span class="argos-rail-icon" aria-hidden="true">⚓</span>
          <span class="argos-rail-label">Ships</span>
          <span class="argos-rail-meta">
            <span class="argos-layer-count">—</span>
            <span class="argos-rail-state">UNAVAILABLE</span>
          </span>
        </button>
        <button type="button" class="argos-rail-row is-disabled" disabled aria-disabled="true" data-layer="cameras">
          <span class="argos-rail-icon" aria-hidden="true">◉</span>
          <span class="argos-rail-label">Cameras</span>
          <span class="argos-rail-meta">
            <span class="argos-layer-count">—</span>
            <span class="argos-rail-state">UNAVAILABLE</span>
          </span>
        </button>
        <button type="button" class="argos-rail-row is-disabled" disabled aria-disabled="true" data-layer="infra">
          <span class="argos-rail-icon" aria-hidden="true">▣</span>
          <span class="argos-rail-label">Infra</span>
          <span class="argos-rail-meta">
            <span class="argos-layer-count">—</span>
            <span class="argos-rail-state">UNAVAILABLE</span>
          </span>
        </button>
      </nav>
      <p class="argos-cp-note">DEMO counts only when local fixtures exist. No fabricated live totals. Ships/cameras await admitted backends.</p>
    </aside>

    <aside id="argos-detail-panel" class="argos-detail-panel" hidden aria-live="polite">
      <div class="argos-panel-head">
        <div class="argos-panel-title" data-argos-detail-title>—</div>
        <button type="button" class="argos-icon-btn" data-argos-action="close-detail" aria-label="Close">✕</button>
      </div>
      <div class="argos-panel-body">
        <div class="argos-status-pill" data-argos-detail-status>DEMO</div>
        <dl class="argos-telemetry">
          <div><dt>ID</dt><dd data-argos-detail-id>—</dd></div>
          <div><dt>Callsign</dt><dd data-argos-detail-callsign>—</dd></div>
          <div><dt>Altitude</dt><dd data-argos-detail-alt>—</dd></div>
          <div><dt>Speed</dt><dd data-argos-detail-spd>—</dd></div>
          <div><dt>Heading</dt><dd data-argos-detail-hdg>—</dd></div>
          <div><dt>Position</dt><dd data-argos-detail-pos>—</dd></div>
        </dl>
        <p class="argos-detail-note" data-argos-detail-note></p>
      </div>
    </aside>

    <div class="argos-basemap-banner" data-argos-basemap-banner hidden role="alert">
      <span>BASEMAP OFFLINE</span>
      <button type="button" class="argos-hud-btn" data-argos-action="retry-basemap">Retry</button>
    </div>

    <div class="argos-bottom-left">
      <div class="argos-globe-inset" title="Decorative inset — presentation only" aria-hidden="true">
        <span>3D</span>
      </div>
      <div class="argos-coords" data-argos-coords>UTC — · —</div>
    </div>

    <div class="argos-mode-toast" data-argos-toast hidden role="status"></div>
  `;

  return {
    root,
    mapHost: root.querySelector('#argos-map-host'),
    detailPanel: root.querySelector('#argos-detail-panel'),
    controlPanel: root.querySelector('#argos-control-panel'),
    coordsEl: root.querySelector('[data-argos-coords]'),
    toastEl: root.querySelector('[data-argos-toast]'),
    aircraftCountEl: root.querySelector('[data-argos-aircraft-count]'),
    basemapBanner: root.querySelector('[data-argos-basemap-banner]'),
    aircraftToggle: root.querySelector('[data-argos-action="toggle-aircraft"]'),
  };
}

export function bindArgosShellActions(root, handlers) {
  root.addEventListener('click', (event) => {
    const btn = event.target.closest?.('[data-argos-action]');
    if (!btn || btn.disabled) return;
    const action = btn.getAttribute('data-argos-action');
    handlers[action]?.(event, btn);
  });
}

export function renderAircraftDetail(shell, record) {
  const panel = shell.detailPanel;
  if (!record) {
    panel.hidden = true;
    return;
  }
  panel.hidden = false;
  panel.querySelector('[data-argos-detail-title]').textContent =
    record.label || record.callsign || record.id;
  panel.querySelector('[data-argos-detail-status]').textContent = record.status;
  panel.querySelector('[data-argos-detail-status]').dataset.status =
    record.status;
  panel.querySelector('[data-argos-detail-id]').textContent = record.id;
  panel.querySelector('[data-argos-detail-callsign]').textContent =
    record.callsign || '—';
  panel.querySelector('[data-argos-detail-alt]').textContent =
    record.altitudeFt == null ? '—' : `${Math.round(record.altitudeFt)} ft`;
  panel.querySelector('[data-argos-detail-spd]').textContent =
    record.groundSpeedKt == null
      ? '—'
      : `${Math.round(record.groundSpeedKt)} kt`;
  panel.querySelector('[data-argos-detail-hdg]').textContent =
    record.headingDeg == null ? '—' : `${Math.round(record.headingDeg)}°`;
  panel.querySelector('[data-argos-detail-pos]').textContent =
    `${record.lat.toFixed(4)}, ${record.lon.toFixed(4)}`;
  panel.querySelector('[data-argos-detail-note]').textContent =
    record.statusNote || '';
}

export function formatUtcCoords(lat, lon, now = new Date()) {
  const utc = now.toISOString().slice(11, 19) + 'Z';
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return `UTC ${utc}`;
  const ns = lat >= 0 ? 'N' : 'S';
  const ew = lon >= 0 ? 'E' : 'W';
  return `UTC ${utc} · ${Math.abs(lat).toFixed(4)}°${ns} ${Math.abs(lon).toFixed(4)}°${ew}`;
}

export function setBasemapBanner(shell, offline) {
  if (!shell.basemapBanner) return;
  shell.basemapBanner.hidden = !offline;
}
