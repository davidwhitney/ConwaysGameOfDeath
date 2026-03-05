import Phaser from 'phaser';
import { loadSettings } from './saveData';
import { Colors } from '../colors';

function isWebGL(scene: Phaser.Scene): boolean {
  return scene.game.renderer.type === Phaser.WEBGL;
}

function addBloom(cam: Phaser.Cameras.Scene2D.Camera): void {
  cam.postFX.addBloom(Colors.effects.bloomThreshold, 2, 2, 2.5, 2.5);
}

function addCRTExtras(cam: Phaser.Cameras.Scene2D.Camera): void {
  cam.postFX.addBarrel(1.04);
  cam.postFX.addVignette(0.5, 0.5, 0.92, 0.3);
}

/**
 * Apply post-processing to the Game scene camera.
 * Bloom is always on (core to the neon aesthetic).
 * Barrel distortion + vignette are optional CRT extras.
 */
export function applyCRT(scene: Phaser.Scene): void {
  const { crtEnabled } = loadSettings();

  if (isWebGL(scene)) {
    const gameScene = scene.game.scene.getScene('Game');
    const gameCam = gameScene?.cameras.main;
    if (gameCam) {
      gameCam.postFX.clear();
      addBloom(gameCam);
      if (crtEnabled) addCRTExtras(gameCam);
    }
  }
}
