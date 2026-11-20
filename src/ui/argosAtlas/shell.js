/**
 * Argos-matched standard-map shell chrome (Caelrion branding).
 * Presentation only — no feeds, no backend calls.
 */

export function createArgosAtlasShell(documentRef = document) {
  const root = documentRef.createElement('div');
  root.id = 'argos-atlas-root';
  root.className = 'argos-atlas-root';
  root.hidden = true;
  root.setAttribute('data-mode', 'hidden');
  root.innerHTML = `
    <div id="argos-map-host" class="argos-map-host" role="application" aria-label="Caelrion dark 2D map"></div>

    <header class="argos-hud" role="banner">
      <div class="argos-hud-brand">
        <img class="argos-hud-logo" src="/logo.svg" alt="" width="28" height="28" />
        <div class="argos-hud-brand-text">
          <div class="argos-hud-title">CAELRION VIEW</div>
          <div class="argos-hud-sub">We never blink.</div>
        </div>
      </div>
      <div class="argos-hud-search" role="search">
        <input type="search" class="argos-search-input" placeholder="Search places, flights, ships…" disabled aria-disabled="true" title="Search — BACKEND_CONTRACT_PENDING" />
        <span class="argos-chip argos-chip-pending">UNAVAILABLE</span>
      </div>
      <div class="argos-hud-right">
        <button type="button" class="argos-hud-btn" data-argos-action="toggle-filters" aria-expanded="true" aria-controls="argos-control-panel" title="Filters">
          <span aria-hidden="true">☰</span><span class="argos-hud-btn-label">Filters</span>
        </button>
        <button type="button" class="argos-hud-btn" data-argos-action="toggle-3d" title="Switch to Cesium 3D globe">3D</button>
      </div>
    </header>

    <aside id="argos-control-panel" class="argos-control-panel" aria-label="Layer filters">
      <div class="argos-cp-head">
        <span>Layers</span>
        <button type="button" class="argos-icon-btn" data-argos-action="toggle-filters" aria-label="Close filters">✕</button>
      </div>
      <div class="argos-cp-body">
        <label class="argos-layer-row argos-layer-active">
          <input type="checkbox" checked disabled data-layer="aircraft" />
          <span class="argos-layer-swatch" style="--swatch:#3de7ff"></span>
          <span class="argos-layer-name">Aircraft</span>
          <span class="argos-layer-count" data-argos-aircraft-count>1</span>
        </label>
        <label class="argos-layer-row argos-layer-disabled">
          <input type="checkbox" disabled data-layer="ships" />
          <span class="argos-layer-swatch" style="--swatch:#5b8cff"></span>
          <span class="argos-layer-name">Ships</span>
          <span class="argos-layer-count">—</span>
        </label>
        <label class="argos-layer-row argos-layer-disabled">
          <input type="checkbox" disabled data-layer="cameras" />
          <span class="argos-layer-swatch" style="--swatch:#ffd23b"></span>
          <span class="argos-layer-name">Cameras</span>
          <span class="argos-layer-count">—</span>
        </label>
        <p class="argos-cp-note">Additional layers: DEMO/UNAVAILABLE until admitted backend projections exist. No fabricated live counts.</p>
      </div>
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

    <div class="argos-bottom-left">
      <div class="argos-globe-inset" title="Globe inset — presentation placeholder" aria-hidden="true">
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
  };
}

export function bindArgosShellActions(root, handlers) {
  root.addEventListener('click', (event) => {
    const btn = event.target.closest?.('[data-argos-action]');
    if (!btn) return;
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
