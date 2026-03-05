import Phaser from 'phaser';
import { loadSettings } from './saveData';

function isWebGL(scene: Phaser.Scene): boolean {
  return scene.game.renderer.type === Phaser.WEBGL;
}

function addPostFX(cam: Phaser.Cameras.Scene2D.Camera): void {
  cam.postFX.addBarrel(1.04);
  cam.postFX.addBloom(0xffffff, 0.3, 0.3, 1.0, 1.0);
  cam.postFX.addVignette(0.5, 0.5, 0.88, 0.25);
}

/**
 * Apply CRT post-processing to the Game scene camera:
 * barrel distortion + bloom + vignette (WebGL only).
 *
 * Only affects the playfield — HUD, menus, and overlays stay clean.
 */
export function applyCRT(scene: Phaser.Scene): void {
  const { crtEnabled } = loadSettings();

  if (isWebGL(scene)) {
    const gameScene = scene.game.scene.getScene('Game');
    const gameCam = gameScene?.cameras.main;
    if (gameCam) {
      gameCam.postFX.clear();
      if (crtEnabled) addPostFX(gameCam);
    }
  }
}
