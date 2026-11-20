/**
 * Client-only local search for the Argos 2D shell.
 * Coordinates, bundled place presets, DEMO aircraft labels, and already-loaded
 * MapLibre label features — no network geocoding, no fabricated live results.
 */

/** Bundled place presets (lat/lon WGS84). Not a live gazetteer. */
export const LOCAL_PLACE_PRESETS = Object.freeze([
  {
    id: 'place-madrid',
    label: 'Madrid',
    kind: 'place',
    lat: 40.4168,
    lon: -3.7038,
    zoom: 10,
  },
  {
    id: 'place-lisbon',
    label: 'Lisbon',
    kind: 'place',
    lat: 38.7223,
    lon: -9.1393,
    zoom: 10,
  },
  {
    id: 'place-barcelona',
    label: 'Barcelona',
    kind: 'place',
    lat: 41.3874,
    lon: 2.1686,
    zoom: 10,
  },
  {
    id: 'place-paris',
    label: 'Paris',
    kind: 'place',
    lat: 48.8566,
    lon: 2.3522,
    zoom: 10,
  },
  {
    id: 'place-london',
    label: 'London',
    kind: 'place',
    lat: 51.5074,
    lon: -0.1278,
    zoom: 10,
  },
  {
    id: 'place-nyc',
    label: 'New York',
    kind: 'place',
    lat: 40.7128,
    lon: -74.006,
    zoom: 10,
  },
  {
    id: 'place-sf',
    label: 'San Francisco',
    kind: 'place',
    lat: 37.7749,
    lon: -122.4194,
    zoom: 11,
  },
  {
    id: 'place-tokyo',
    label: 'Tokyo',
    kind: 'place',
    lat: 35.6762,
    lon: 139.6503,
    zoom: 10,
  },
  {
    id: 'place-sydney',
    label: 'Sydney',
    kind: 'place',
    lat: -33.8688,
    lon: 151.2093,
    zoom: 10,
  },
  {
    id: 'place-cairo',
    label: 'Cairo',
    kind: 'place',
    lat: 30.0444,
    lon: 31.2357,
    zoom: 10,
  },
]);

/**
 * Parse "lat, lon" or "lat lon" pairs in range.
 * @returns {{ lat: number, lon: number } | null}
 */
export function parseLatLonQuery(raw) {
  const text = String(raw || '').trim();
  if (!text) return null;
  const m = text.match(
    /^\s*(-?\d+(?:\.\d+)?)\s*[,;\s]\s*(-?\d+(?:\.\d+)?)\s*$/,
  );
  if (!m) return null;
  const lat = Number(m[1]);
  const lon = Number(m[2]);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
  if (Math.abs(lat) > 90 || Math.abs(lon) > 180) return null;
  return { lat, lon };
}

function normalize(text) {
  return String(text || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

/**
 * @param {{
 *   query: string,
 *   aircraft?: { id?: string, callsign?: string, label?: string, lat: number, lon: number } | null,
 *   map?: { queryRenderedFeatures?: Function, getStyle?: Function } | null,
 *   limit?: number,
 * }} options
 * @returns {{ results: Array<object>, emptyMessage: string | null }}
 */
export function searchLocal({
  query,
  aircraft = null,
  map = null,
  limit = 8,
} = {}) {
  const q = normalize(query);
  if (!q) return { results: [], emptyMessage: null };

  const results = [];
  const seen = new Set();

  const push = (item) => {
    if (!item || seen.has(item.id)) return;
    seen.add(item.id);
    results.push(item);
  };

  const coords = parseLatLonQuery(query);
  if (coords) {
    push({
      id: `coord-${coords.lat},${coords.lon}`,
      label: `${coords.lat.toFixed(4)}, ${coords.lon.toFixed(4)}`,
      kind: 'coordinates',
      lat: coords.lat,
      lon: coords.lon,
      zoom: 8,
    });
  }

  if (aircraft) {
    const hay = [aircraft.id, aircraft.callsign, aircraft.label]
      .filter(Boolean)
      .map(normalize);
    if (hay.some((h) => h.includes(q) || q.includes(h))) {
      push({
        id: `aircraft-${aircraft.id}`,
        label: aircraft.label || aircraft.callsign || aircraft.id,
        kind: 'aircraft',
        lat: aircraft.lat,
        lon: aircraft.lon,
        zoom: 8,
        aircraftId: aircraft.id,
      });
    }
  }

  for (const place of LOCAL_PLACE_PRESETS) {
    if (
      normalize(place.label).includes(q) ||
      q.includes(normalize(place.label))
    ) {
      push({ ...place });
    }
  }

  // Already-loaded MapLibre symbol features near the viewport (no network).
  if (map && typeof map.queryRenderedFeatures === 'function' && q.length >= 2) {
    try {
      const style = map.getStyle?.();
      const symbolLayerIds = (style?.layers || [])
        .filter((layer) => layer.type === 'symbol')
        .map((layer) => layer.id)
        .slice(0, 24);
      const features = symbolLayerIds.length
        ? map.queryRenderedFeatures(undefined, { layers: symbolLayerIds })
        : map.queryRenderedFeatures();
      for (const feature of features || []) {
        if (results.length >= limit) break;
        const name =
          feature.properties?.name ||
          feature.properties?.name_en ||
          feature.properties?.['name:latin'] ||
          null;
        if (!name || !normalize(name).includes(q)) continue;
        const geom = feature.geometry;
        let lon;
        let lat;
        if (geom?.type === 'Point') {
          [lon, lat] = geom.coordinates;
        } else if (Array.isArray(feature.geometry?.coordinates?.[0])) {
          // skip non-point for stable fly-to
          continue;
        }
        if (!Number.isFinite(lat) || !Number.isFinite(lon)) continue;
        push({
          id: `map-${normalize(name)}-${lon.toFixed(3)}-${lat.toFixed(3)}`,
          label: String(name),
          kind: 'map-feature',
          lat,
          lon,
          zoom: 11,
        });
      }
    } catch {
      /* ignore feature query failures */
    }
  }

  const sliced = results.slice(0, limit);
  return {
    results: sliced,
    emptyMessage: sliced.length === 0 ? 'No locally available result' : null,
  };
}
