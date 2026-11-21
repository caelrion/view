/**
 * R19-2 — Progressive road / label opacity by MapLibre zoom.
 *
 * Reference bands (calibrated for Argos-like quiet world/regional views):
 *   z ≤ 7   minor roads/labels off; highways nearly off
 *   z 8–10  highways/majors fade in; minors still quiet
 *   z 10–12 majors readable; minors begin
 *   z ≥ 12  full street detail
 *
 * Mutates paint copies only — does not replace Protomaps layer definitions.
 */

const MINOR_ROAD =
  /^(roads_minor|roads_other|roads_link|roads_tunnel_other|roads_tunnel_minor|roads_bridges_other|roads_bridges_minor|roads_pier)/;
const MAJOR_ROAD =
  /^(roads_major|roads_bridges_major|roads_bridges_link|roads_tunnel_major|roads_tunnel_link)/;
const HIGHWAY_ROAD =
  /^(roads_highway|roads_bridges_highway|roads_tunnel_highway)/;
const ROAD_LABEL = /^(roads_label_|address_label|roads_shields|roads_oneway)/;

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
      expr = opacityExpr([7, 0, 9, 0, 10.5, 0.35, 12, 1, 13, 1]);
    } else if (MAJOR_ROAD.test(id)) {
      expr = opacityExpr([6, 0, 8, 0.25, 9.5, 0.7, 11, 1, 12, 1]);
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
