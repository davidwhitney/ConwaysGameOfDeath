import Phaser from 'phaser';
import { loadSettings } from './preferences';

let scanlineOverlay: HTMLDivElement | null = null;

function isWebGL(scene: Phaser.Scene): boolean {
  return scene.game.renderer.type === Phaser.WEBGL;
}

/**
 * Apply CRT post-processing to a scene's main camera:
 * barrel distortion + bloom + vignette (Phaser FX, WebGL only)
 * and CSS scanline overlay (always).
 *
 * Checks the crtEnabled setting — if disabled, removes any existing
 * scanline overlay and skips WebGL postFX.
 */
export function applyCRT(scene: Phaser.Scene): void {
  const { crtEnabled } = loadSettings();

  if (!crtEnabled) {
    removeScanlines();
    return;
  }

  if (isWebGL(scene)) {
    const cam = scene.cameras.main;

    // Barrel distortion — subtle CRT bulge
    cam.postFX.addBarrel(1.04);

    // Phosphor glow — soft bloom like a CRT tube
    cam.postFX.addBloom(0xffffff, 0.6, 0.6, 1.0, 1.2);

    // Dark vignette around edges
    cam.postFX.addVignette(0.5, 0.5, 0.85, 0.35);
  }

  // CSS scanlines work regardless of renderer
  if (!scanlineOverlay) {
    injectScanlines(scene);
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
