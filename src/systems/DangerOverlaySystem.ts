import Phaser from 'phaser';
import type { UpdateContext } from './UpdateContext';
import type { GameSystem } from './GameSystem';
import { Colors } from '../colors';

/**
 * Draws a pulsing red border when the player's HP drops below 40%.
 * Uses scrollFactor(0) so it stays screen-fixed.
 */
export class DangerOverlaySystem implements GameSystem {
  private overlay: Phaser.GameObjects.Graphics;
  private scene: Phaser.Scene;
  private wasActive = false;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.overlay = scene.add.graphics();
    this.overlay.setDepth(100);
    this.overlay.setScrollFactor(0);
  }

  update(ctx: UpdateContext): void {
    const hpPct = ctx.player.state.hp / ctx.player.state.maxHp;
    if (hpPct >= 0.4) {
      if (this.wasActive) { this.overlay.clear(); this.wasActive = false; }
      return;
    }
    this.wasActive = true;
    this.overlay.clear();

    const intensity = 1 - hpPct / 0.4; // 0→1 as HP drops
    const pulse = Math.sin(ctx.time.elapsed * 0.006) * 0.5 + 0.5;
    const alpha = (0.15 + intensity * 0.45) * (0.5 + pulse * 0.5);
    const cam = this.scene.cameras.main;
    const w = cam.width;
    const h = cam.height;
    const thickness = 120 + intensity * 80;

    this.overlay.fillStyle(Colors.effects.danger, alpha);
    this.overlay.fillRect(0, 0, w, thickness); // top
    this.overlay.fillRect(0, h - thickness, w, thickness); // bottom
    this.overlay.fillRect(0, 0, thickness, h); // left
    this.overlay.fillRect(w - thickness, 0, thickness, h); // right
  }

  destroy(): void {
    this.overlay.destroy();
  }
}
