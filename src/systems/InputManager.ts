import Phaser from 'phaser';
import type { Vec2 } from '../types';

interface InputSource {
  getMovement(): Vec2;
  isMenuPressed(): boolean;
}

export class InputManager {
  private sources: InputSource[];

  constructor(scene: Phaser.Scene) {
    this.sources = [
      new KeyboardInput(scene),
      new GamepadInput(scene),
      new TouchInput(scene),
      new MouseInput(scene),
    ];
  }

  getMovement(): Vec2 {
    let dx = 0;
    let dy = 0;

    for (const source of this.sources) {
      ({ x: dx, y: dy } = source.getMovement());
      if (dx !== 0 || dy !== 0) break;
    }

    // Normalize diagonal movement
    if (dx !== 0 && dy !== 0) {
      const len = Math.sqrt(dx * dx + dy * dy);
      if (len > 1) {
        dx /= len;
        dy /= len;
      }
    }

    return { x: dx, y: dy };
  }

  isMenuPressed(): boolean {
    return this.sources.some(s => s.isMenuPressed());
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

class KeyboardInput {
  private cursors: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd: { W: Phaser.Input.Keyboard.Key; A: Phaser.Input.Keyboard.Key; S: Phaser.Input.Keyboard.Key; D: Phaser.Input.Keyboard.Key };
  private escKey: Phaser.Input.Keyboard.Key;

  constructor(scene: Phaser.Scene) {
    const kb = scene.input.keyboard!;
    this.cursors = kb.createCursorKeys();
    this.wasd = {
      W: kb.addKey(Phaser.Input.Keyboard.KeyCodes.W),
      A: kb.addKey(Phaser.Input.Keyboard.KeyCodes.A),
      S: kb.addKey(Phaser.Input.Keyboard.KeyCodes.S),
      D: kb.addKey(Phaser.Input.Keyboard.KeyCodes.D),
    };
    this.escKey = kb.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);
  }

  getMovement(): Vec2 {
    let dx = 0;
    let dy = 0;
    if (this.cursors.left.isDown || this.wasd.A.isDown) dx -= 1;
    if (this.cursors.right.isDown || this.wasd.D.isDown) dx += 1;
    if (this.cursors.up.isDown || this.wasd.W.isDown) dy -= 1;
    if (this.cursors.down.isDown || this.wasd.S.isDown) dy += 1;
    return { x: dx, y: dy };
  }

  isMenuPressed(): boolean {
    return Phaser.Input.Keyboard.JustDown(this.escKey);
  }
}

class GamepadInput {
  private scene: Phaser.Scene;
  private startWasDown = false;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  getMovement(): Vec2 {
    const pad = this.scene.input.gamepad?.pad1;
    if (!pad) return { x: 0, y: 0 };

    const DEADZONE = 0.2;
    let dx = 0;
    let dy = 0;
    if (Math.abs(pad.leftStick.x) > DEADZONE) dx = pad.leftStick.x;
    if (Math.abs(pad.leftStick.y) > DEADZONE) dy = pad.leftStick.y;
    if (dx === 0 && dy === 0) {
      if (pad.left) dx -= 1;
      if (pad.right) dx += 1;
      if (pad.up) dy -= 1;
      if (pad.down) dy += 1;
    }
    return { x: dx, y: dy };
  }

  isMenuPressed(): boolean {
    const pad = this.scene.input.gamepad?.pad1;
    if (!pad) return false;

    const startDown = pad.buttons[9]?.pressed ?? false;
    if (startDown && !this.startWasDown) {
      this.startWasDown = startDown;
      return true;
    }
    this.startWasDown = startDown;
    return false;
  }
}

class TouchInput {
  private scene: Phaser.Scene;
  private down = false;
  private originX = 0;
  private originY = 0;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    scene.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (!pointer.wasTouch) return;
      this.down = true;
      this.originX = pointer.x;
      this.originY = pointer.y;
    });
    scene.input.on('pointerup', (pointer: Phaser.Input.Pointer) => {
      if (pointer.wasTouch) this.down = false;
    });
  }

  getMovement(): Vec2 {
    if (!this.down) return { x: 0, y: 0 };
    const pointer = this.scene.input.activePointer;
    const tdx = pointer.x - this.originX;
    const tdy = pointer.y - this.originY;
    const len = Math.sqrt(tdx * tdx + tdy * tdy);
    if (len > 15) return { x: tdx / len, y: tdy / len };
    return { x: 0, y: 0 };
  }

  isMenuPressed(): boolean { return false; }
}

class MouseInput {
  private scene: Phaser.Scene;
  private down = false;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    scene.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (!pointer.wasTouch) this.down = true;
    });
    scene.input.on('pointerup', (pointer: Phaser.Input.Pointer) => {
      if (!pointer.wasTouch) this.down = false;
    });
  }

  getMovement(): Vec2 {
    if (!this.down) return { x: 0, y: 0 };
    const pointer = this.scene.input.activePointer;
    const cam = this.scene.cameras.main;
    const worldX = pointer.x / cam.zoom + cam.worldView.x;
    const worldY = pointer.y / cam.zoom + cam.worldView.y;
    const playerX = cam.worldView.x + cam.worldView.width / 2;
    const playerY = cam.worldView.y + cam.worldView.height / 2;
    let dx = worldX - playerX;
    let dy = worldY - playerY;
    const len = Math.sqrt(dx * dx + dy * dy);
    if (len > 8) {
      dx /= len;
      dy /= len;
    } else {
      dx = 0;
      dy = 0;
    }
    return { x: dx, y: dy };
  }

  isMenuPressed(): boolean { return false; }
}
