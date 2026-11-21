/**
 * R19-2 — Progressive road / label opacity by MapLibre zoom.
 *
 * Reference bands (calibrated for Argos-like quiet world/regional views):
 *   z ≤ 7   minor roads/labels off; highways nearly off
 *   z 8–10  highways/majors fade in; minors still quiet
 *   z 10–12 majors readable; minors begin
 *   z ≥ 12  street detail (Satellite then restrains residential — R21)
 *
 * Mutates paint copies only — does not replace Protomaps layer definitions.
 *
 * R26 Satellite selective gold: Protomaps `kind=major_road` includes
 * secondary/tertiary. Only trunk/primary keep soft gold; demoted classes
 * reuse residential paint. See applySatelliteSelectiveGoldRoads.
 */

/** Residential / service / pier — never highway ramps (`roads_link`). */
const MINOR_ROAD =
  /^(roads_minor|roads_other|roads_minor_service|roads_tunnels_other|roads_tunnels_minor|roads_bridges_other|roads_bridges_minor|roads_pier|roads_secondary|roads_bridges_secondary|roads_tunnels_secondary|roads_link_local|roads_bridges_link_local|roads_tunnels_link_local)/;
/** True arterials (post-R26 filter) + qualifying highway/trunk ramps. */
const MAJOR_ROAD =
  /^(roads_major|roads_link|roads_bridges_major|roads_bridges_link|roads_tunnels_major|roads_tunnels_link)/;
const HIGHWAY_ROAD =
  /^(roads_highway|roads_bridges_highway|roads_tunnels_highway)/;
const ROAD_LABEL =
  /^(roads_labels_|roads_label_|address_label|roads_shields|roads_oneway)/;

/**
 * OSM kind_detail values that keep Satellite soft-gold (Tier 2).
 * Verified present on owned Protomaps `roads` layer.
 */
export const SATELLITE_GOLD_MAJOR_KIND_DETAILS = Object.freeze([
  'trunk',
  'primary',
]);

/**
 * Demoted former major_road classes — neutral residential treatment.
 */
export const SATELLITE_DEMOTE_MAJOR_KIND_DETAILS = Object.freeze([
  'secondary',
  'tertiary',
]);

/**
 * Link kind_detail values that keep soft gold for freeway continuity.
 */
export const SATELLITE_GOLD_LINK_KIND_DETAILS = Object.freeze([
  'motorway_link',
  'trunk_link',
]);

function opacityExpr(stops) {
  return ['interpolate', ['linear'], ['zoom'], ...stops];
}

function withOpacity(paint, key, expr) {
  if (!paint || typeof paint !== 'object') return paint;
  return { ...paint, [key]: expr };
}

/**
 * @param {object[]} layers Protomaps-generated MapLibre layers
 * @returns {object[]} layers with zoom-based opacity expressions
 */
export function applyProgressiveRoadDetail(layers) {
  if (!Array.isArray(layers)) return layers;
  return layers.map((layer) => {
    const id = String(layer?.id || '');
    const type = layer?.type;
    if (!id || (type !== 'line' && type !== 'symbol')) return layer;

    let expr = null;
    if (MINOR_ROAD.test(id)) {
      // Dark mode: minors can reach full opacity at street scale.
      expr = opacityExpr([7, 0, 9, 0, 10.5, 0.35, 12, 1, 13, 1]);
    } else if (MAJOR_ROAD.test(id)) {
      // Progressive fade-in; Satellite R26 further caps via selective gold.
      expr = opacityExpr([6, 0, 8, 0.2, 9.5, 0.55, 11, 0.85, 12.5, 1]);
    } else if (HIGHWAY_ROAD.test(id)) {
      // Highway casings/lines: quiet at world scale, clear by metro zoom.
      if (/casing|_casing/.test(id)) {
        expr = opacityExpr([5, 0, 7, 0.15, 9, 0.55, 11, 1]);
      } else {
        expr = opacityExpr([5, 0.05, 7, 0.35, 9, 0.85, 11, 1]);
      }
    } else if (ROAD_LABEL.test(id)) {
      if (/minor|address|oneway/.test(id)) {
        expr = opacityExpr([11, 0, 12.5, 0.55, 14, 1]);
      } else if (/shield/.test(id)) {
        expr = opacityExpr([8, 0, 9.5, 0.4, 11, 1]);
      } else {
        expr = opacityExpr([9, 0, 10.5, 0.55, 12, 1]);
      }
    }

    if (!expr) return layer;
    const paintKey = type === 'symbol' ? 'text-opacity' : 'line-opacity';
    const nextPaint = withOpacity(layer.paint || {}, paintKey, expr);
    // Symbol layers also use icon-opacity for shields.
    if (type === 'symbol' && /shield/.test(id)) {
      nextPaint['icon-opacity'] = expr;
    }
    return { ...layer, paint: nextPaint };
  });
}

/**
 * R21 Satellite-only: keep residential streets as faint detail so gold
 * highway/major emphasis reads. Does not touch highway or major arterials.
 * Must run after applyProgressiveRoadDetail on Satellite overlays only.
 *
 * @param {object[]} layers
 * @returns {object[]}
 */
export function applySatelliteResidentialRestraint(layers) {
  if (!Array.isArray(layers)) return layers;
  // Cap: never a dense opaque street grid over photography.
  const minorLine = opacityExpr([
    9, 0, 11, 0.08, 12.5, 0.18, 14, 0.28, 16, 0.32,
  ]);
  const minorLabel = opacityExpr([12.5, 0, 14, 0.28, 16, 0.4]);
  return layers.map((layer) => {
    const id = String(layer?.id || '');
    const type = layer?.type;
    if (!id || (type !== 'line' && type !== 'symbol')) return layer;
    if (HIGHWAY_ROAD.test(id) || MAJOR_ROAD.test(id)) return layer;
    if (type === 'line' && MINOR_ROAD.test(id)) {
      // Skip heavy casings on residential — keep photography readable.
      if (/casing|_casing/.test(id)) {
        return {
          ...layer,
          paint: withOpacity(
            layer.paint || {},
            'line-opacity',
            opacityExpr([12, 0, 14, 0.1, 16, 0.16]),
          ),
        };
      }
      return {
        ...layer,
        paint: withOpacity(layer.paint || {}, 'line-opacity', minorLine),
      };
    }
    if (
      type === 'symbol' &&
      /roads_labels_minor|address_label|roads_oneway/.test(id)
    ) {
      return {
        ...layer,
        paint: withOpacity(layer.paint || {}, 'text-opacity', minorLabel),
      };
    }
    return layer;
  });
}

function andFilter(existing, extra) {
  if (!extra) return existing;
  if (!existing) return extra;
  if (Array.isArray(existing) && existing[0] === 'all') {
    return [...existing, extra];
  }
  return ['all', existing, extra];
}

/** Legacy MapLibre filter form — matches Protomaps layer filters (no ['get']). */
function kindDetailIn(details) {
  return ['in', 'kind_detail', ...details];
}

function kindDetailNotIn(details) {
  return ['!in', 'kind_detail', ...details];
}

function cloneLayerWith(layer, { id, filter, paintPatch }) {
  return {
    ...layer,
    id,
    filter,
    paint: { ...(layer.paint || {}), ...paintPatch },
  };
}

/**
 * R26 — Restrict Satellite gold to highways + trunk/primary arterials.
 *
 * Diagnostic (owned PMTiles, Garden Grove / Huntington Beach z12):
 *   major_road|secondary was as numerous as primary and all painted `#D6BE82`.
 * Secondary/tertiary stay drawn as neutral residential; motorway/trunk ramps
 * keep soft gold for network continuity; other links demote.
 *
 * @param {object[]} layers
 * @param {{ residentialColor?: string }} [opts]
 * @returns {object[]}
 */
export function applySatelliteSelectiveGoldRoads(
  layers,
  { residentialColor = '#C8D0D4' } = {},
) {
  if (!Array.isArray(layers)) return layers;

  const goldMajor = kindDetailIn(SATELLITE_GOLD_MAJOR_KIND_DETAILS);
  const demoteMajor = kindDetailIn(SATELLITE_DEMOTE_MAJOR_KIND_DETAILS);
  // Freeway ramps (kind=highway) + trunk_link keep soft gold.
  const goldLink = [
    'any',
    ['==', 'kind', 'highway'],
    kindDetailIn(SATELLITE_GOLD_LINK_KIND_DETAILS),
  ];
  const demoteLink = [
    'all',
    ['!=', 'kind', 'highway'],
    kindDetailNotIn(SATELLITE_GOLD_LINK_KIND_DETAILS),
  ];
  const notLink = ['!has', 'is_link'];

  const minorLine = opacityExpr([
    9, 0, 11, 0.08, 12.5, 0.18, 14, 0.28, 16, 0.32,
  ]);
  const minorCasing = opacityExpr([12, 0, 14, 0.1, 16, 0.16]);
  /** Soft-gold majors: readable but less dominant than R21 full-grid. */
  const majorLine = opacityExpr([7, 0, 9, 0.35, 10.5, 0.65, 12, 0.82, 14, 0.9]);
  const majorCasing = opacityExpr([8, 0, 10, 0.25, 12, 0.55, 14, 0.7]);
  const goldLinkLine = opacityExpr([12, 0, 13, 0.45, 14.5, 0.75, 16, 0.85]);

  const out = [];
  for (const layer of layers) {
    const id = String(layer?.id || '');
    const type = layer?.type;

    // Narrow major arterials to trunk/primary; emit secondary/tertiary clones.
    if (
      type === 'line' &&
      /^(roads_major|roads_bridges_major|roads_tunnels_major)/.test(id)
    ) {
      const narrowed = andFilter(andFilter(layer.filter, notLink), goldMajor);
      const isCasing = /casing|_casing/.test(id);
      out.push({
        ...layer,
        filter: narrowed,
        paint: withOpacity(
          layer.paint || {},
          'line-opacity',
          isCasing ? majorCasing : majorLine,
        ),
      });
      const demotedId = id
        .replace('roads_major', 'roads_secondary')
        .replace('roads_bridges_major', 'roads_bridges_secondary')
        .replace('roads_tunnels_major', 'roads_tunnels_secondary');
      out.push(
        cloneLayerWith(layer, {
          id: demotedId,
          filter: andFilter(andFilter(layer.filter, notLink), demoteMajor),
          paintPatch: {
            'line-color': residentialColor,
            'line-opacity': isCasing ? minorCasing : minorLine,
          },
        }),
      );
      continue;
    }

    // Links: keep soft gold only for freeway / trunk ramps.
    if (
      type === 'line' &&
      /^(roads_link|roads_bridges_link|roads_tunnels_link)/.test(id) &&
      !/_local$/.test(id)
    ) {
      const isCasing = /casing|_casing/.test(id);
      out.push({
        ...layer,
        filter: andFilter(layer.filter, goldLink),
        paint: withOpacity(
          {
            ...(layer.paint || {}),
            // Soft gold retained via existing flavor color on roads_link.
          },
          'line-opacity',
          isCasing ? majorCasing : goldLinkLine,
        ),
      });
      const localId = `${id}_local`;
      out.push(
        cloneLayerWith(layer, {
          id: localId,
          filter: andFilter(layer.filter, demoteLink),
          paintPatch: {
            'line-color': residentialColor,
            'line-opacity': isCasing ? minorCasing : minorLine,
          },
        }),
      );
      continue;
    }

    // Major road name labels: highway + trunk/primary only (not secondary grid).
    if (type === 'symbol' && id === 'roads_labels_major') {
      out.push({
        ...layer,
        filter: andFilter(layer.filter, [
          'any',
          ['==', 'kind', 'highway'],
          kindDetailIn(SATELLITE_GOLD_MAJOR_KIND_DETAILS),
        ]),
      });
      continue;
    }

    out.push(layer);
  }
  return out;
}
