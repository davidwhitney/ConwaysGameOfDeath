import Phaser from 'phaser';
import { WORLD_WIDTH, WORLD_HEIGHT, CAMERA_ZOOM } from '../constants';
import { loadSettings } from '../ui/saveData';

/** Max camera tilt in radians (~1.5 degrees) */
const MAX_TILT = 0.026;
/** How quickly the tilt lerps toward the target (0-1, higher = snappier) */
const TILT_LERP = 0.08;

export class CameraManager {
  private camera: Phaser.Cameras.Scene2D.Camera;
  private currentTilt: number = 0;

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

  /** Smoothly tilt the camera based on player movement direction. */
  updateTilt(facingX: number, facingY: number, isMoving: boolean): void {
    const targetTilt = isMoving ? -facingX * MAX_TILT : 0;
    this.currentTilt += (targetTilt - this.currentTilt) * TILT_LERP;
    this.camera.setRotation(this.currentTilt);
  }

  getCamera(): Phaser.Cameras.Scene2D.Camera {
    return this.camera;
  }

  getWorldView(): Phaser.Geom.Rectangle {
    return this.camera.worldView;
  }

  static viewDiagonalRadius(cam: Phaser.Cameras.Scene2D.Camera): number {
    const halfW = cam.worldView.width / 2;
    const halfH = cam.worldView.height / 2;
    return Math.sqrt(halfW * halfW + halfH * halfH);
  }
}
