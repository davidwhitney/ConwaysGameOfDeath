import Phaser from 'phaser';
import type { Vec2 } from '../shared';

export class InputManager {
  private scene: Phaser.Scene;
  private cursors: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd: { W: Phaser.Input.Keyboard.Key; A: Phaser.Input.Keyboard.Key; S: Phaser.Input.Keyboard.Key; D: Phaser.Input.Keyboard.Key };
  private escKey: Phaser.Input.Keyboard.Key;

  // Virtual d-pad: touch origin becomes the centre, drag direction = movement
  private touchActive = false;
  private touchOriginX = 0;
  private touchOriginY = 0;

  // Gamepad Start button edge detection
  private startWasDown = false;

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

    scene.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      this.touchActive = true;
      this.touchOriginX = pointer.x;
      this.touchOriginY = pointer.y;
    });
    scene.input.on('pointerup', () => { this.touchActive = false; });
  }

  getMovement(): Vec2 {
    let dx = 0;
    let dy = 0;

    // Keyboard
    if (this.cursors.left.isDown || this.wasd.A.isDown) dx -= 1;
    if (this.cursors.right.isDown || this.wasd.D.isDown) dx += 1;
    if (this.cursors.up.isDown || this.wasd.W.isDown) dy -= 1;
    if (this.cursors.down.isDown || this.wasd.S.isDown) dy += 1;

    // Gamepad stick + dpad
    if (dx === 0 && dy === 0) {
      const pad = this.scene.input.gamepad?.pad1;
      if (pad) {
        const DEADZONE = 0.2;
        if (Math.abs(pad.leftStick.x) > DEADZONE) dx = pad.leftStick.x;
        if (Math.abs(pad.leftStick.y) > DEADZONE) dy = pad.leftStick.y;
        if (dx === 0 && dy === 0) {
          if (pad.left) dx -= 1;
          if (pad.right) dx += 1;
          if (pad.up) dy -= 1;
          if (pad.down) dy += 1;
        }
      }
    }

    // Touch/mouse virtual d-pad — direction is drag offset from touch origin
    if (this.touchActive && dx === 0 && dy === 0) {
      const pointer = this.scene.input.activePointer;
      const tdx = pointer.x - this.touchOriginX;
      const tdy = pointer.y - this.touchOriginY;
      const len = Math.sqrt(tdx * tdx + tdy * tdy);
      // Deadzone in screen pixels so a tap doesn't cause jitter
      if (len > 15) {
        dx = tdx / len;
        dy = tdy / len;
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
    if (Phaser.Input.Keyboard.JustDown(this.escKey)) return true;

    const pad = this.scene.input.gamepad?.pad1;
    if (pad) {
      const startDown = pad.buttons[9]?.pressed ?? false;
      if (startDown && !this.startWasDown) {
        this.startWasDown = startDown;
        return true;
      }
      this.startWasDown = startDown;
    }

    return false;
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
