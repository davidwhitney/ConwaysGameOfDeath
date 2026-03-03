import Phaser from 'phaser';
import { loadSettings } from './preferences';

let scanlineOverlay: HTMLDivElement | null = null;

function isWebGL(scene: Phaser.Scene): boolean {
  return scene.game.renderer.type === Phaser.WEBGL;
}

function addPostFX(cam: Phaser.Cameras.Scene2D.Camera): void {
  cam.postFX.addBarrel(1.04);
  cam.postFX.addBloom(0xffffff, 0.3, 0.3, 1.0, 1.0);
  cam.postFX.addVignette(0.5, 0.5, 0.88, 0.25);
}

/**
 * Apply CRT post-processing to all scene cameras:
 * barrel distortion + bloom + vignette (Phaser FX, WebGL only)
 * and CSS scanline overlay (always).
 *
 * Checks the crtEnabled setting — if disabled, removes effects
 * from every scene. If enabled, clears and reapplies to every
 * scene so toggling mid-game updates all cameras.
 */
export function applyCRT(scene: Phaser.Scene): void {
  const { crtEnabled } = loadSettings();

  if (isWebGL(scene)) {
    // Always clear first to avoid duplicates
    for (const s of scene.game.scene.getScenes(false)) {
      s.cameras.main?.postFX.clear();
    }

    if (crtEnabled) {
      for (const s of scene.game.scene.getScenes(false)) {
        const cam = s.cameras.main;
        if (cam) addPostFX(cam);
      }
    }
  }

  if (crtEnabled) {
    if (!scanlineOverlay) injectScanlines(scene);
  } else {
    removeScanlines();
  }
}

function injectScanlines(scene: Phaser.Scene): void {
  const container = scene.game.canvas.parentElement;
  if (!container) return;

  // Ensure container is a positioning context
  container.style.position = 'relative';

  const overlay = document.createElement('div');
  overlay.style.cssText = [
    'position:absolute',
    'inset:0',
    'pointer-events:none',
    'z-index:100',
    'background:repeating-linear-gradient(to bottom,transparent 0px,transparent 2px,rgba(0,0,0,0.12) 2px,rgba(0,0,0,0.12) 4px)',
    'mix-blend-mode:multiply',
  ].join(';');

  container.appendChild(overlay);
  scanlineOverlay = overlay;
}

function removeScanlines(): void {
  if (scanlineOverlay) {
    scanlineOverlay.remove();
    scanlineOverlay = null;
  }
}
