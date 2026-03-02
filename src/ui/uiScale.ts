/**
 * Calculate UI zoom factor based on screen dimensions.
 * Returns ~2 on desktop (1080p+), scales down for smaller screens.
 */
export function getUIZoom(canvasWidth: number, canvasHeight: number): number {
  const shortest = Math.min(canvasWidth, canvasHeight);
  return Math.max(0.75, Math.min(2, shortest / 480));
}

/** Apply UI zoom to a scene camera and return the logical width/height for layout */
export function applyUIZoom(scene: Phaser.Scene): { width: number; height: number; zoom: number } {
  const zoom = getUIZoom(scene.scale.width, scene.scale.height);
  const cam = scene.cameras.main;
  cam.setZoom(zoom);
  cam.setScroll(
    -scene.scale.width * (1 - 1 / zoom) / 2,
    -scene.scale.height * (1 - 1 / zoom) / 2,
  );
  return {
    width: scene.scale.width / zoom,
    height: scene.scale.height / zoom,
    zoom,
  };
}
