import Phaser from 'phaser';
import { WORLD_WIDTH, WORLD_HEIGHT, CAMERA_ZOOM } from '../shared';
import { loadSettings } from '../ui/saveData';

export class CameraManager {
  private camera: Phaser.Cameras.Scene2D.Camera;

  constructor(scene: Phaser.Scene) {
    this.camera = scene.cameras.main;
    this.camera.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
    const { gameZoom } = loadSettings();
    this.camera.setZoom(CAMERA_ZOOM * gameZoom);
  }

  follow(target: Phaser.GameObjects.Sprite | Phaser.GameObjects.Image): void {
    this.camera.startFollow(target, true, 0.1, 0.1);
  }

  shake(duration: number = 100, intensity: number = 0.005): void {
    this.camera.shake(duration, intensity);
  }

  flash(duration: number = 100, r: number = 255, g: number = 0, b: number = 0): void {
    this.camera.flash(duration, r, g, b, false, undefined, undefined);
  }

  getCamera(): Phaser.Cameras.Scene2D.Camera {
    return this.camera;
  }

  getWorldView(): Phaser.Geom.Rectangle {
    return this.camera.worldView;
  }
}
