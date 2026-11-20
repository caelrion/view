/**
 * Bounded MapLibre 2D presenter. Owns map lifecycle only — not feeds.
 */
import maplibregl from 'maplibre-gl';
import {
  OPENFREEMAP_STYLE_URL,
  MAP_ATTRIBUTION_HTML,
  createOfflineDarkStyleStub,
  applyReadableDarkPaint,
  classifyMapError,
} from './style.js';

const SOURCE_ID = 'caelrion-aircraft-demo';
const LAYER_ID = 'caelrion-aircraft-demo-circle';
const HEADING_LAYER_ID = 'caelrion-aircraft-demo-heading';
const SELECTED_LAYER_ID = 'caelrion-aircraft-demo-selected';
const LABEL_LAYER_ID = 'caelrion-aircraft-demo-label';
const HIT_LAYER_ID = 'caelrion-aircraft-demo-hit';
const AIRCRAFT_LAYER_IDS = [
  HIT_LAYER_ID,
  LAYER_ID,
  SELECTED_LAYER_ID,
  LABEL_LAYER_ID,
  HEADING_LAYER_ID,
];

const MAX_BASEMAP_RETRIES = 3;

export class MapLibre2DPresenter {
  /**
   * @param {HTMLElement} container
   * @param {{ onSelect?: (id: string|null) => void, onError?: (err: Error) => void, onBasemapState?: (state: string) => void }} [options]
   */
  constructor(
    container,
    { onSelect = null, onError = null, onBasemapState = null } = {},
  ) {
    if (!(container instanceof HTMLElement)) {
      throw new TypeError('MAPLIBRE_CONTAINER_REQUIRED');
    }
    this._container = container;
    this._onSelect = onSelect;
    this._onError = onError;
    this._onBasemapState = onBasemapState;
    this._map = null;
    this._aircraft = null;
    this._selectedId = null;
    this._destroyed = false;
    this._styleMode = 'remote';
    this._basemapState = 'loading';
    this._aircraftVisible = true;
    this._clickHandler = null;
    this._keydownHandler = null;
    this._errorHandler = null;
    this._moveHandlers = [];
    this._onWindowResize = null;
    this._basemapRetries = 0;
    this._tileFailCount = 0;
    this._attributionUserTouched = false;
    this._collapseAttribution = null;
  }

  get map() {
    return this._map;
  }

  get styleMode() {
    return this._styleMode;
  }

  get selectedId() {
    return this._selectedId;
  }

  get basemapState() {
    return this._basemapState;
  }

  get aircraftVisible() {
    return this._aircraftVisible;
  }

  async mount({
    center = [-3.7038, 40.4168],
    zoom = 5.2,
    bearing = 0,
    pitch = 0,
  } = {}) {
    if (this._destroyed) throw new Error('MAPLIBRE_PRESENTER_DESTROYED');
    if (this._map) return this._map;

    this._setBasemapState('loading');
    const map = new maplibregl.Map({
      container: this._container,
      style: OPENFREEMAP_STYLE_URL,
      center,
      zoom,
      bearing,
      pitch,
      attributionControl: false,
      failIfMajorPerformanceCaveat: false,
      projection: { type: 'mercator' },
      fadeDuration: 0,
    });
    this._map = map;

    map.addControl(
      new maplibregl.AttributionControl({
        compact: true,
        customAttribution: MAP_ATTRIBUTION_HTML,
      }),
      'bottom-right',
    );
    map.addControl(
      new maplibregl.NavigationControl({ visualizePitch: true }),
      'bottom-right',
    );
    // MapLibre with compact:true starts with `maplibregl-compact-show` (expanded
    // white strip). Collapse to the info chip until the operator opens it.
    // Re-assert on early sourcedata/idle; stop once the operator has interacted.
    this._collapseAttribution = () => {
      if (this._attributionUserTouched) return;
      const el = this._container.querySelector?.('.maplibregl-ctrl-attrib');
      if (!el) return;
      el.classList.add('maplibregl-compact');
      el.classList.remove('maplibregl-compact-show');
      // MapLibre collapsed compact state uses the `open` attribute (details quirk).
      el.setAttribute('open', '');
    };
    this._onAttributionUserToggle = () => {
      this._attributionUserTouched = true;
    };
    map.once('load', () => {
      this._collapseAttribution();
      const el = this._container.querySelector?.('.maplibregl-ctrl-attrib');
      el?.querySelector?.('.maplibregl-ctrl-attrib-button')?.addEventListener(
        'click',
        this._onAttributionUserToggle,
        { once: true },
      );
    });
    map.on('sourcedata', this._collapseAttribution);
    map.once('idle', () => {
      this._collapseAttribution();
      // After first idle, stop fighting MapLibre unless still untouched.
      if (!this._attributionUserTouched) {
        map.off('sourcedata', this._collapseAttribution);
      }
    });

    this._errorHandler = (event) => this._onMapError(event);
    map.on('error', this._errorHandler);

    await new Promise((resolve, reject) => {
      const onLoad = () => {
        cleanup();
        try {
          applyReadableDarkPaint(map);
        } catch {
          /* non-fatal */
        }
        this._styleMode = 'remote';
        this._setBasemapState('ready');
        resolve();
      };
      const onError = (event) => {
        const classified = classifyMapError(event);
        // During first style load, never wipe the map for transient tile/glyph
        // or ambiguous errors — wait for `load` or an explicit style-fatal.
        if (classified.kind !== 'style-fatal') {
          this._tileFailCount += 1;
          this._onError?.(new Error(`MAP_TILE_OR_GLYPH:${classified.message}`));
          return;
        }
        cleanup();
        this._enterOfflineBasemap(classified.message);
        resolve();
      };
      const cleanup = () => {
        map.off('load', onLoad);
        map.off('error', onError);
      };
      map.on('load', onLoad);
      map.on('error', onError);
    });

    if (this._destroyed) {
      map.remove();
      this._map = null;
      return null;
    }

    this._ensureAircraftLayers();
    this._clickHandler = (event) => {
      const layers = AIRCRAFT_LAYER_IDS.filter((id) => map.getLayer(id));
      if (!layers.length || !this._aircraftVisible) {
        this.select(null);
        return;
      }
      // Expand hit area slightly for touch / small markers.
      const pad = 14;
      const bbox = [
        [event.point.x - pad, event.point.y - pad],
        [event.point.x + pad, event.point.y + pad],
      ];
      const hits = map.queryRenderedFeatures(bbox, { layers });
      const id = hits[0]?.properties?.id || null;
      this.select(id);
    };
    map.on('click', this._clickHandler);

    this._keydownHandler = (event) => this._onKeyDown(event);
    if (typeof this._container.addEventListener === 'function') {
      this._container.tabIndex = 0;
      this._container.setAttribute('role', 'application');
      this._container.addEventListener('keydown', this._keydownHandler);
    }

    this._onWindowResize = () => {
      try {
        map.resize();
      } catch (_err) {
        /* ignore during teardown */
      }
    };
    if (typeof globalThis.addEventListener === 'function') {
      globalThis.addEventListener('resize', this._onWindowResize);
    }
    this.resize();
    return map;
  }

  /** Bounded retry after BASEMAP OFFLINE — restores remote Fiord style. */
  async retryBasemap() {
    if (this._destroyed || !this._map) return false;
    if (this._basemapRetries >= MAX_BASEMAP_RETRIES) {
      this._onError?.(new Error('MAP_BASEMAP_RETRY_EXHAUSTED'));
      return false;
    }
    this._basemapRetries += 1;
    this._setBasemapState('loading');
    const map = this._map;
    const aircraft = this._aircraft;
    const selected = this._selectedId;
    try {
      await new Promise((resolve, reject) => {
        const onLoad = () => {
          cleanup();
          resolve();
        };
        const onError = (event) => {
          const classified = classifyMapError(event);
          if (classified.kind === 'tile-or-glyph') return;
          cleanup();
          reject(new Error(classified.message));
        };
        const cleanup = () => {
          map.off('load', onLoad);
          map.off('error', onError);
        };
        map.once('load', onLoad);
        map.once('error', onError);
        map.setStyle(OPENFREEMAP_STYLE_URL);
      });
      applyReadableDarkPaint(map);
      this._styleMode = 'remote';
      this._setBasemapState('ready');
      this._ensureAircraftLayers();
      if (aircraft) this.setAircraft(aircraft);
      if (selected) this.select(selected);
      this.setAircraftVisible(this._aircraftVisible);
      return true;
    } catch (err) {
      this._enterOfflineBasemap(String(err?.message || err));
      return false;
    }
  }

  setAircraft(record) {
    if (this._destroyed || !this._map) return;
    this._aircraft = record;
    this._ensureAircraftLayers();
    const source = this._map.getSource(SOURCE_ID);
    if (source && typeof source.setData === 'function') {
      source.setData(this._featureCollection());
    }
    if (record) {
      this._map.easeTo({
        center: [record.lon, record.lat],
        zoom: Math.max(this._map.getZoom(), 5.5),
        duration: 600,
      });
    }
  }

  setAircraftVisible(visible) {
    this._aircraftVisible = Boolean(visible);
    const map = this._map;
    if (!map) return;
    const vis = this._aircraftVisible ? 'visible' : 'none';
    for (const id of AIRCRAFT_LAYER_IDS) {
      if (map.getLayer(id)) {
        try {
          map.setLayoutProperty(id, 'visibility', vis);
        } catch {
          /* ignore */
        }
      }
    }
    if (!this._aircraftVisible) this.select(null);
  }

  select(id) {
    this._selectedId = id || null;
    if (this._map?.getSource(SOURCE_ID)) {
      this._map.getSource(SOURCE_ID).setData(this._featureCollection());
    }
    this._onSelect?.(this._selectedId);
  }

  /** Fly camera to a WGS84 point (local search / programmatic focus). */
  flyTo({ lon, lat, zoom = 8, duration = 900 } = {}) {
    if (!this._map || !Number.isFinite(lon) || !Number.isFinite(lat)) return;
    this._map.flyTo({
      center: [lon, lat],
      zoom,
      duration,
      essential: true,
    });
  }

  resize() {
    this._map?.resize();
  }

  destroy() {
    this._destroyed = true;
    if (this._onWindowResize) {
      if (typeof globalThis.removeEventListener === 'function') {
        globalThis.removeEventListener('resize', this._onWindowResize);
      }
      this._onWindowResize = null;
    }
    if (this._keydownHandler && this._container) {
      this._container.removeEventListener?.('keydown', this._keydownHandler);
      this._keydownHandler = null;
    }
    if (this._map) {
      if (this._clickHandler) this._map.off('click', this._clickHandler);
      if (this._errorHandler) this._map.off('error', this._errorHandler);
      if (this._collapseAttribution) {
        this._map.off('sourcedata', this._collapseAttribution);
      }
      for (const [type, handler] of this._moveHandlers) {
        this._map.off(type, handler);
      }
      this._map.remove();
    }
    this._map = null;
    this._clickHandler = null;
    this._errorHandler = null;
    this._moveHandlers = [];
    this._aircraft = null;
    this._selectedId = null;
  }

  _setBasemapState(state) {
    this._basemapState = state;
    this._onBasemapState?.(state);
  }

  _enterOfflineBasemap(message) {
    const map = this._map;
    if (!map) return;
    this._styleMode = 'offline-stub';
    this._setBasemapState('offline');
    try {
      map.setStyle(createOfflineDarkStyleStub());
    } catch (err) {
      this._onError?.(err instanceof Error ? err : new Error(String(err)));
    }
    this._onError?.(new Error(`MAP_BASEMAP_OFFLINE:${message}`));
  }

  _onMapError(event) {
    if (this._destroyed || this._styleMode !== 'remote') return;
    const classified = classifyMapError(event);
    if (classified.kind === 'tile-or-glyph' || classified.kind === 'unknown') {
      this._tileFailCount += 1;
      // Isolated failures stay soft — never replace a live style with black.
      return;
    }
    if (classified.kind === 'style-fatal') {
      this._enterOfflineBasemap(classified.message);
    }
  }

  _onKeyDown(event) {
    if (this._destroyed || !this._map) return;
    const key = event.key;
    if (key === 'Escape') {
      this.select(null);
      event.preventDefault();
      return;
    }
    if (
      (key === 'Enter' || key === ' ') &&
      this._aircraft &&
      this._aircraftVisible
    ) {
      const next =
        this._selectedId === this._aircraft.id ? null : this._aircraft.id;
      this.select(next);
      event.preventDefault();
    }
  }

  _ensureAircraftLayers() {
    const map = this._map;
    if (!map) return;
    if (!map.getSource(SOURCE_ID)) {
      map.addSource(SOURCE_ID, {
        type: 'geojson',
        data: this._featureCollection(),
      });
    }
    // Invisible oversized hit target for touch / keyboard discoverability.
    if (!map.getLayer(HIT_LAYER_ID)) {
      map.addLayer({
        id: HIT_LAYER_ID,
        type: 'circle',
        source: SOURCE_ID,
        paint: {
          'circle-radius': 22,
          'circle-color': '#000000',
          'circle-opacity': 0,
          'circle-stroke-width': 0,
        },
      });
    }
    if (!map.getLayer(LAYER_ID)) {
      map.addLayer({
        id: LAYER_ID,
        type: 'circle',
        source: SOURCE_ID,
        paint: {
          'circle-radius': ['case', ['==', ['get', 'selected'], 1], 9, 7],
          'circle-color': '#3de7ff',
          'circle-stroke-width': [
            'case',
            ['==', ['get', 'selected'], 1],
            2.5,
            1.5,
          ],
          'circle-stroke-color': '#e8fdff',
          'circle-opacity': 0.95,
        },
      });
    }
    if (!map.getLayer(SELECTED_LAYER_ID)) {
      map.addLayer({
        id: SELECTED_LAYER_ID,
        type: 'circle',
        source: SOURCE_ID,
        filter: ['==', ['get', 'selected'], 1],
        paint: {
          'circle-radius': 18,
          'circle-color': 'rgba(61, 231, 255, 0.2)',
          'circle-stroke-width': 1.5,
          'circle-stroke-color': '#3de7ff',
        },
      });
    }
    if (!map.getLayer(LABEL_LAYER_ID)) {
      map.addLayer({
        id: LABEL_LAYER_ID,
        type: 'symbol',
        source: SOURCE_ID,
        layout: {
          'text-field': ['get', 'label'],
          'text-size': 12,
          'text-offset': [0, 1.45],
          'text-font': ['Open Sans Regular', 'Noto Sans Regular'],
          'text-optional': true,
          'text-allow-overlap': false,
        },
        paint: {
          'text-color': '#e8f7ff',
          'text-halo-color': '#1a2230',
          'text-halo-width': 1.4,
        },
      });
    }
    if (!map.getLayer(HEADING_LAYER_ID)) {
      map.addLayer({
        id: HEADING_LAYER_ID,
        type: 'symbol',
        source: SOURCE_ID,
        layout: {
          'text-field': '▲',
          'text-size': 14,
          'text-rotate': ['get', 'heading'],
          'text-rotation-alignment': 'map',
          'text-allow-overlap': true,
          'text-ignore-placement': true,
          'text-font': ['Open Sans Bold', 'Noto Sans Bold'],
        },
        paint: {
          'text-color': '#3de7ff',
          'text-halo-color': '#1a2230',
          'text-halo-width': 1.2,
        },
      });
    }
    this.setAircraftVisible(this._aircraftVisible);
  }

  _featureCollection() {
    if (!this._aircraft) {
      return { type: 'FeatureCollection', features: [] };
    }
    const a = this._aircraft;
    const selected = this._selectedId && this._selectedId === a.id ? 1 : 0;
    return {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          geometry: {
            type: 'Point',
            coordinates: [a.lon, a.lat],
          },
          properties: {
            id: a.id,
            label: a.label || a.callsign || a.id,
            heading: a.headingDeg ?? 0,
            selected,
            status: a.status,
            provenance: a.provenance,
          },
        },
      ],
    };
  }
}
