import Phaser from 'phaser';
import type { Vec2 } from '../shared';

export class InputManager {
  private scene: Phaser.Scene;
  private cursors: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd: { W: Phaser.Input.Keyboard.Key; A: Phaser.Input.Keyboard.Key; S: Phaser.Input.Keyboard.Key; D: Phaser.Input.Keyboard.Key };
  private escKey: Phaser.Input.Keyboard.Key;

  // Mouse/touch — hold to move toward pointer
  private pointerDown = false;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    const kb = scene.input.keyboard!;
    this.cursors = kb.createCursorKeys();
    this.wasd = {
      W: kb.addKey(Phaser.Input.Keyboard.KeyCodes.W),
      A: kb.addKey(Phaser.Input.Keyboard.KeyCodes.A),
      S: kb.addKey(Phaser.Input.Keyboard.KeyCodes.S),
      D: kb.addKey(Phaser.Input.Keyboard.KeyCodes.D),
    };
    this.escKey = kb.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);

    scene.input.on('pointerdown', () => { this.pointerDown = true; });
    scene.input.on('pointerup', () => { this.pointerDown = false; });
  }

  getMovement(): Vec2 {
    let dx = 0;
    let dy = 0;

    // Keyboard
    if (this.cursors.left.isDown || this.wasd.A.isDown) dx -= 1;
    if (this.cursors.right.isDown || this.wasd.D.isDown) dx += 1;
    if (this.cursors.up.isDown || this.wasd.W.isDown) dy -= 1;
    if (this.cursors.down.isDown || this.wasd.S.isDown) dy += 1;

    // Mouse/touch — move toward pointer world position while held
    if (this.pointerDown && dx === 0 && dy === 0) {
      const pointer = this.scene.input.activePointer;
      const cam = this.scene.cameras.main;
      const worldX = pointer.x / cam.zoom + cam.worldView.x;
      const worldY = pointer.y / cam.zoom + cam.worldView.y;
      // Use player sprite position (center of camera follow target)
      const playerX = cam.worldView.x + cam.worldView.width / 2;
      const playerY = cam.worldView.y + cam.worldView.height / 2;
      dx = worldX - playerX;
      dy = worldY - playerY;
      const len = Math.sqrt(dx * dx + dy * dy);
      // Small deadzone so player doesn't jitter when pointer is right on them
      if (len > 8) {
        dx /= len;
        dy /= len;
      } else {
        dx = 0;
        dy = 0;
      }
    }

    // Normalize diagonal movement (for keyboard)
    if (dx !== 0 && dy !== 0) {
      const len = Math.sqrt(dx * dx + dy * dy);
      if (len > 1) {
        dx /= len;
        dy /= len;
      }
    }

    return { x: dx, y: dy };
  }

  isEscPressed(): boolean {
    return Phaser.Input.Keyboard.JustDown(this.escKey);
  }

  /** Get raw direction for facing (-1, 0, 1) */
  getRawDirection(): Vec2 {
    const m = this.getMovement();
    return {
      x: m.x === 0 ? 0 : (m.x > 0 ? 1 : -1),
      y: m.y === 0 ? 0 : (m.y > 0 ? 1 : -1),
    };
  }
}
