import * as Cesium from 'cesium';

// Attribution and service rights are documented in DATA_SOURCES.md.
// Argos 3D declutter: no on-screen Esri source strip (footer removed).
export const ESRI_SOURCE_ATTRIBUTION = '';

/** @deprecated Prefer ESRI_SOURCE_ATTRIBUTION — empty for Argos 3D declutter. */
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
