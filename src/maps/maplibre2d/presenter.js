/**
 * Bounded MapLibre 2D presenter. Owns map lifecycle only — not feeds.
 */
import maplibregl from 'maplibre-gl';
import {
  OPENFREEMAP_DARK_STYLE_URL,
  MAP_ATTRIBUTION_HTML,
  createOfflineDarkStyleStub,
} from './style.js';

const SOURCE_ID = 'caelrion-aircraft-demo';
const LAYER_ID = 'caelrion-aircraft-demo-circle';
const HEADING_LAYER_ID = 'caelrion-aircraft-demo-heading';
const SELECTED_LAYER_ID = 'caelrion-aircraft-demo-selected';
const LABEL_LAYER_ID = 'caelrion-aircraft-demo-label';

export class MapLibre2DPresenter {
  /**
   * @param {HTMLElement} container
   * @param {{ onSelect?: (id: string|null) => void, onError?: (err: Error) => void }} [options]
   */
  constructor(container, { onSelect = null, onError = null } = {}) {
    if (!(container instanceof HTMLElement)) {
      throw new TypeError('MAPLIBRE_CONTAINER_REQUIRED');
    }
    this._container = container;
    this._onSelect = onSelect;
    this._onError = onError;
    this._map = null;
    this._aircraft = null;
    this._selectedId = null;
    this._destroyed = false;
    this._styleMode = 'remote';
    this._clickHandler = null;
    this._moveHandlers = [];
    this._onWindowResize = null;
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

  async mount({
    center = [-3.7038, 40.4168],
    zoom = 5.2,
    bearing = 0,
    pitch = 0,
  } = {}) {
    if (this._destroyed) throw new Error('MAPLIBRE_PRESENTER_DESTROYED');
    if (this._map) return this._map;

    const map = new maplibregl.Map({
      container: this._container,
      style: OPENFREEMAP_DARK_STYLE_URL,
      center,
      zoom,
      bearing,
      pitch,
      attributionControl: false,
      failIfMajorPerformanceCaveat: false,
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

    await new Promise((resolve, reject) => {
      const onLoad = () => {
        cleanup();
        resolve();
      };
      const onError = (event) => {
        // Style/tile errors: switch to offline stub once, keep map usable.
        const message = String(event?.error?.message || event?.error || event);
        if (this._styleMode === 'remote') {
          this._styleMode = 'offline-stub';
          try {
            map.setStyle(createOfflineDarkStyleStub());
            this._onError?.(
              new Error(`MAP_STYLE_FALLBACK:${message}`),
            );
          } catch (err) {
            cleanup();
            reject(err instanceof Error ? err : new Error(String(err)));
          }
          return;
        }
        cleanup();
        reject(new Error(`MAP_STYLE_FAILED:${message}`));
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
      const layers = [LAYER_ID, SELECTED_LAYER_ID, LABEL_LAYER_ID].filter(
        (id) => map.getLayer(id),
      );
      const hits = map.queryRenderedFeatures(event.point, { layers });
      const id = hits[0]?.properties?.id || null;
      this.select(id);
    };
    map.on('click', this._clickHandler);
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
    // Host may have been zero-sized during first paint (loader / mode switch).
    this.resize();
    return map;
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

  select(id) {
    this._selectedId = id || null;
    if (this._map?.getSource(SOURCE_ID)) {
      this._map.getSource(SOURCE_ID).setData(this._featureCollection());
    }
    this._onSelect?.(this._selectedId);
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
    if (this._map) {
      if (this._clickHandler) this._map.off('click', this._clickHandler);
      for (const [type, handler] of this._moveHandlers) {
        this._map.off(type, handler);
      }
      this._map.remove();
    }
    this._map = null;
    this._clickHandler = null;
    this._moveHandlers = [];
    this._aircraft = null;
    this._selectedId = null;
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
    // Circle + heading stub avoids sprite/icon dependency on a specific style.
    if (!map.getLayer(LAYER_ID)) {
      map.addLayer({
        id: LAYER_ID,
        type: 'circle',
        source: SOURCE_ID,
        paint: {
          'circle-radius': ['case', ['==', ['get', 'selected'], 1], 7, 5],
          'circle-color': '#3de7ff',
          'circle-stroke-width': ['case', ['==', ['get', 'selected'], 1], 2, 1],
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
          'circle-radius': 14,
          'circle-color': 'rgba(61, 231, 255, 0.18)',
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
          'text-size': 11,
          'text-offset': [0, 1.35],
          'text-font': ['Open Sans Regular', 'Noto Sans Regular'],
          'text-optional': true,
          'text-allow-overlap': false,
        },
        paint: {
          'text-color': '#c8f7ff',
          'text-halo-color': '#0b0f14',
          'text-halo-width': 1.2,
        },
      });
    }
    if (!map.getLayer(HEADING_LAYER_ID)) {
      // Heading cue via rotated text chevron — no proprietary icon asset.
      map.addLayer({
        id: HEADING_LAYER_ID,
        type: 'symbol',
        source: SOURCE_ID,
        layout: {
          'text-field': '▲',
          'text-size': 12,
          'text-rotate': ['get', 'heading'],
          'text-rotation-alignment': 'map',
          'text-allow-overlap': true,
          'text-ignore-placement': true,
          'text-font': ['Open Sans Bold', 'Noto Sans Bold'],
        },
        paint: {
          'text-color': '#3de7ff',
          'text-halo-color': '#0b0f14',
          'text-halo-width': 1,
        },
      });
    }
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
