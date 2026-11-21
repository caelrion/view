import * as Cesium from 'cesium';
import { catalogControlServices } from './catalog.js';
import { StyleManager } from '../ui/composition.js';
import { flyToAustin } from '../camera.js';
import { initCockpitCloudEffects } from '../cockpitCloudEffects.js';
import {
  ArgosAtlasMode,
  preferArgos2DFromLocation,
} from '../ui/argosAtlas/mode.js';

/** Construct the existing controls and camera presentation. */
export function createApplicationControls({
  scene: { viewer, mapStackController, operations },
  loaderStatus,
  Controls = StyleManager,
  services,
  catalog,
  placeSearch,
  defer,
}) {
  // Initialize the style manager (post-processing, HUD, locations, share links)
  const styleManager = new Controls(viewer, {
    services: {
      ...services,
      ...operations.surface.controlServices,
      searchAndFlyTo: operations.searchAndFlyTo,
      fetchRegionalBrief: (...args) =>
        operations.requests.regional.getBrief(...args),
      ...catalogControlServices(catalog),
    },
    requestServices: operations.requests,
    mapStackController,
    placeSearch,
  });
  defer(() => styleManager.orbitController.stop());
  defer(() => styleManager.hud.destroy());
  defer(() => styleManager.dispose());
  // The previous multi-canvas weather compositor remains disabled. Cockpit
  // clouds use a separate, capped low-resolution GPU pass that never attaches
  // Cesium fog or post-process stages and is fully stopped in map mode.
  const weatherEffects = null;
  const cockpitCloudEffects = initCockpitCloudEffects(viewer, {
    weatherService: operations.requests.weather,
  });
  defer(() => cockpitCloudEffects?.destroy());

  // Argos-standard 2D map is the default at `/`. Opt into Cesium via
  // ?view=3d / ?map=3d. Uses DEMO aircraft until a backend projection exists.
  // Does not register a new feed poller.
  const preferArgos2D = preferArgos2DFromLocation();
  const argosAtlasMode = new ArgosAtlasMode({
    viewer,
    preferArgos2D,
    aircraftProjection: null,
    cesium: Cesium,
  });
  defer(() => argosAtlasMode.destroy());

  // Skip Cesium fly-to while flat 2D owns the viewport — avoids globe flash
  // and wasted camera work under the MapLibre shell.
  if (preferArgos2D) {
    loaderStatus.textContent = 'Dark map ready';
  } else if (!styleManager.hasShareState) {
    loaderStatus.textContent = 'Caelrion View 3D ready';
    defer(flyToAustin(viewer));
  } else {
    loaderStatus.textContent = 'Restoring shared view...';
  }

  return { styleManager, weatherEffects, cockpitCloudEffects, argosAtlasMode };
}
