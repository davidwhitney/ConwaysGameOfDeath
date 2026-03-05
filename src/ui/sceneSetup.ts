import { applyUIZoom } from './uiScale';
import { applyCRT } from './crtEffect';
import { onResizeRestart } from './resizeHandler';

interface SetupOptions {
  bringToTop?: boolean;
  crt?: boolean;
  initData?: object;
}

export function setupMenuScene(
  scene: Phaser.Scene,
  options?: SetupOptions,
): { width: number; height: number } {
  if (options?.bringToTop) scene.scene.bringToTop();
  const { width, height } = applyUIZoom(scene);
  if (options?.crt !== false) applyCRT(scene);
  onResizeRestart(scene, options?.initData);
  scene.events.once('shutdown', () => {
    scene.input.keyboard!.removeAllListeners();
  });
  return { width, height };
}
