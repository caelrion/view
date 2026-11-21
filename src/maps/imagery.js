import * as Cesium from 'cesium';

// Attribution and service rights are documented in DATA_SOURCES.md.
// On-screen credit is source text only — no promotional "Powered by Esri" link.
export const ESRI_SOURCE_ATTRIBUTION =
  'Source: Esri, Maxar, Earthstar Geographics, and the GIS User Community';

/** @deprecated Prefer ESRI_SOURCE_ATTRIBUTION — kept as the same plain-text credit. */
export const ESRI_ATTRIBUTION_HTML = ESRI_SOURCE_ATTRIBUTION;

export function createOsmImagery() {
  return new Cesium.OpenStreetMapImageryProvider({
    url: 'https://tile.openstreetmap.org/',
    credit: '© OpenStreetMap contributors',
  });
}

export function createEsriImagery() {
  return Cesium.ArcGisMapServerImageryProvider.fromUrl(
    'https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer',
    {
      credit: ESRI_SOURCE_ATTRIBUTION,
      enablePickFeatures: false,
    },
  );
}

export function createIonImagery(style, accessToken) {
  accessToken = String(accessToken || '').trim();
  if (!accessToken) throw new Error('Ion imagery requires an explicit token');
  return Cesium.IonImageryProvider.fromAssetId(style, { accessToken });
}
