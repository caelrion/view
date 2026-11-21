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
 * R26 selective gold + R04 neutral streets + R27 gold softening:
 *   Gold: highway + trunk (+ freeway/trunk ramps) — softer, less luminous
 *   Neutral readable: primary, then secondary (quieter at wide zoom)
 *   Subtle: tertiary + residential/service
 * See applySatelliteSelectiveGoldRoads.
 */

/** Residential / service / pier — never demoted arterial clones. */
const MINOR_ROAD =
  /^(roads_minor|roads_other|roads_minor_service|roads_tunnels_other|roads_tunnels_minor|roads_bridges_other|roads_bridges_minor|roads_pier|roads_tertiary|roads_bridges_tertiary|roads_tunnels_tertiary|roads_link_local|roads_bridges_link_local|roads_tunnels_link_local)/;
/** True gold arterials (trunk) + qualifying highway/trunk ramps. */
const MAJOR_ROAD =
  /^(roads_major|roads_link|roads_bridges_major|roads_bridges_link|roads_tunnels_major|roads_tunnels_link)/;
const HIGHWAY_ROAD =
  /^(roads_highway|roads_bridges_highway|roads_tunnels_highway)/;
const ROAD_LABEL =
  /^(roads_labels_|roads_label_|address_label|roads_shields|roads_oneway)/;

/**
 * OSM kind_detail values that keep Satellite soft-gold (Tier 2).
 * Primary/secondary stay neutral (R04) — not gold.
 */
export const SATELLITE_GOLD_MAJOR_KIND_DETAILS = Object.freeze(['trunk']);

/** Neutral primary arterials — readable, not gold. */
export const SATELLITE_NEUTRAL_PRIMARY_KIND_DETAILS = Object.freeze([
  'primary',
]);

/** Neutral secondary collectors — muted but visible at city zoom. */
export const SATELLITE_NEUTRAL_SECONDARY_KIND_DETAILS = Object.freeze([
  'secondary',
]);

/** Lowest demoted major_road class — residential-like subtlety. */
export const SATELLITE_NEUTRAL_TERTIARY_KIND_DETAILS = Object.freeze([
  'tertiary',
]);

/**
 * @deprecated R04 — use the NEUTRAL_* arrays. Kept as the union for tests.
 */
export const SATELLITE_DEMOTE_MAJOR_KIND_DETAILS = Object.freeze([
  ...SATELLITE_NEUTRAL_PRIMARY_KIND_DETAILS,
  ...SATELLITE_NEUTRAL_SECONDARY_KIND_DETAILS,
  ...SATELLITE_NEUTRAL_TERTIARY_KIND_DETAILS,
]);

/**
 * Link kind_detail values that keep soft gold for freeway continuity.
 */
export const SATELLITE_GOLD_LINK_KIND_DETAILS = Object.freeze([
  'motorway_link',
  'trunk_link',
]);

/** Neutral colors — cool off-white family, never gold. */
export const SATELLITE_PRIMARY_NEUTRAL = '#E4E9ED';
export const SATELLITE_SECONDARY_NEUTRAL = '#C5CDD3';
export const SATELLITE_TERTIARY_NEUTRAL = '#C8D0D4';

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
  // Subtle but useful at street scale — not the prior 5% city-zoom wipe.
  const minorLine = opacityExpr([
    10, 0, 11.5, 0.16, 13, 0.26, 14.5, 0.34, 16, 0.4,
  ]);
  const minorLabel = opacityExpr([12.5, 0, 14, 0.32, 16, 0.45]);
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
            opacityExpr([12, 0, 14, 0.08, 16, 0.14]),
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

function renameMajorClone(id, token) {
  return id
    .replace('roads_major', `roads_${token}`)
    .replace('roads_bridges_major', `roads_bridges_${token}`)
    .replace('roads_tunnels_major', `roads_tunnels_${token}`);
}

/**
 * R26/R04/R27 — Soft gold on highway+trunk; readable neutral primary/secondary.
 *
 * @param {object[]} layers
 * @param {{ residentialColor?: string, primaryColor?: string, secondaryColor?: string }} [opts]
 * @returns {object[]}
 */
export function applySatelliteSelectiveGoldRoads(
  layers,
  {
    residentialColor = SATELLITE_TERTIARY_NEUTRAL,
    primaryColor = SATELLITE_PRIMARY_NEUTRAL,
    secondaryColor = SATELLITE_SECONDARY_NEUTRAL,
  } = {},
) {
  if (!Array.isArray(layers)) return layers;

  const goldMajor = kindDetailIn(SATELLITE_GOLD_MAJOR_KIND_DETAILS);
  const primaryOnly = kindDetailIn(SATELLITE_NEUTRAL_PRIMARY_KIND_DETAILS);
  const secondaryOnly = kindDetailIn(SATELLITE_NEUTRAL_SECONDARY_KIND_DETAILS);
  const tertiaryOnly = kindDetailIn(SATELLITE_NEUTRAL_TERTIARY_KIND_DETAILS);
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

  // R27: gold stays clear but less luminous than R26 full-bright stops.
  const highwayLine = opacityExpr([
    5, 0.04, 7, 0.28, 9, 0.72, 11, 0.88, 13, 0.9,
  ]);
  const highwayCasing = opacityExpr([5, 0, 7, 0.1, 9, 0.4, 11, 0.7, 13, 0.75]);
  const majorLine = opacityExpr([
    8, 0, 10, 0.24, 11.5, 0.42, 13, 0.52, 15, 0.6,
  ]);
  const majorCasing = opacityExpr([9, 0, 11, 0.1, 13, 0.26, 15, 0.34]);
  const goldLinkLine = opacityExpr([12.5, 0, 13.5, 0.28, 15, 0.48, 16, 0.58]);

  // R04 tiers + R27 quieter wide zoom (streets stay readable by z12).
  const primaryLine = opacityExpr([
    9, 0, 10, 0.22, 11, 0.4, 12, 0.58, 13.5, 0.7, 15, 0.78,
  ]);
  const primaryCasing = opacityExpr([10, 0, 12, 0.14, 14, 0.26, 16, 0.34]);
  const secondaryLine = opacityExpr([
    10, 0, 11, 0.18, 12, 0.38, 13.5, 0.5, 15, 0.6,
  ]);
  const secondaryCasing = opacityExpr([11, 0, 13, 0.1, 15, 0.2, 16, 0.26]);
  const tertiaryLine = opacityExpr([
    10.5, 0, 12, 0.14, 13.5, 0.24, 15, 0.32, 16, 0.38,
  ]);
  const tertiaryCasing = opacityExpr([12, 0, 14, 0.08, 16, 0.14]);
  const localLinkLine = opacityExpr([11, 0, 12.5, 0.22, 14, 0.34, 16, 0.42]);

  const primaryLabel = opacityExpr([11, 0, 12, 0.32, 13.5, 0.62, 15, 0.78]);
  const secondaryLabel = opacityExpr([12, 0, 13, 0.28, 14.5, 0.48, 16, 0.62]);

  const out = [];
  for (const layer of layers) {
    const id = String(layer?.id || '');
    const type = layer?.type;

    // R27: soften highway opacity (color comes from aerial flavor).
    if (
      type === 'line' &&
      /^(roads_highway|roads_bridges_highway|roads_tunnels_highway)/.test(id)
    ) {
      const isCasing = /casing|_casing/.test(id);
      out.push({
        ...layer,
        paint: withOpacity(
          layer.paint || {},
          'line-opacity',
          isCasing ? highwayCasing : highwayLine,
        ),
      });
      continue;
    }

    // Narrow gold majors to trunk; emit neutral primary/secondary/tertiary.
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

      const tiers = [
        {
          token: 'primary',
          filter: primaryOnly,
          color: primaryColor,
          line: primaryLine,
          casing: primaryCasing,
        },
        {
          token: 'secondary',
          filter: secondaryOnly,
          color: secondaryColor,
          line: secondaryLine,
          casing: secondaryCasing,
        },
        {
          token: 'tertiary',
          filter: tertiaryOnly,
          color: residentialColor,
          line: tertiaryLine,
          casing: tertiaryCasing,
        },
      ];
      for (const tier of tiers) {
        out.push(
          cloneLayerWith(layer, {
            id: renameMajorClone(id, tier.token),
            filter: andFilter(andFilter(layer.filter, notLink), tier.filter),
            paintPatch: {
              'line-color': tier.color,
              'line-opacity': isCasing ? tier.casing : tier.line,
            },
          }),
        );
      }
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
          { ...(layer.paint || {}) },
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
            'line-color': secondaryColor,
            'line-opacity': isCasing ? secondaryCasing : localLinkLine,
          },
        }),
      );
      continue;
    }

    // Gold labels: highway + trunk only.
    if (type === 'symbol' && id === 'roads_labels_major') {
      out.push({
        ...layer,
        filter: andFilter(layer.filter, [
          'any',
          ['==', 'kind', 'highway'],
          kindDetailIn(SATELLITE_GOLD_MAJOR_KIND_DETAILS),
        ]),
      });
      // Restore neutral primary/secondary name labels (R04).
      out.push(
        cloneLayerWith(layer, {
          id: 'roads_labels_primary',
          filter: andFilter(
            ['==', 'kind', 'major_road'],
            kindDetailIn(SATELLITE_NEUTRAL_PRIMARY_KIND_DETAILS),
          ),
          paintPatch: {
            'text-color': '#E2E7EB',
            'text-halo-color': 'rgba(23, 32, 39, 0.75)',
            'text-opacity': primaryLabel,
          },
        }),
      );
      out.push(
        cloneLayerWith(layer, {
          id: 'roads_labels_secondary',
          filter: andFilter(
            ['==', 'kind', 'major_road'],
            kindDetailIn(SATELLITE_NEUTRAL_SECONDARY_KIND_DETAILS),
          ),
          paintPatch: {
            'text-color': '#C5CDD3',
            'text-halo-color': 'rgba(23, 32, 39, 0.7)',
            'text-opacity': secondaryLabel,
          },
        }),
      );
      continue;
    }

    out.push(layer);
  }
  return out;
}
