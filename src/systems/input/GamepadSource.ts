import Phaser from 'phaser';
import type { InputMap } from '../InputMap';
import type { InputSource, InputSourceResult } from './InputSourceResult';

const MOVE_DEADZONE = 0.2;
const NAV_DEADZONE = 0.5;

export class GamepadSource implements InputSource {
  private game: Phaser.Game;
  private prevButtons: boolean[] = [];

  constructor(game: Phaser.Game) {
    this.game = game;
  }

  poll(map: InputMap, result: InputSourceResult): void {
    result.moveDx = 0;
    result.moveDy = 0;
    result.navDx = 0;
    result.navDy = 0;
    result.anyJustPressed = false;

    const pad = this.getPad();
    if (!pad) return;

    // Analog stick movement (low deadzone)
    if (Math.abs(pad.leftStick.x) > MOVE_DEADZONE) result.moveDx = pad.leftStick.x;
    if (Math.abs(pad.leftStick.y) > MOVE_DEADZONE) result.moveDy = pad.leftStick.y;

    // D-pad movement fallback
    if (result.moveDx === 0 && result.moveDy === 0) {
      if (pad.left) result.moveDx = -1;
      if (pad.right) result.moveDx = 1;
      if (pad.up) result.moveDy = -1;
      if (pad.down) result.moveDy = 1;
    }

    // Nav: d-pad first, then stick with higher deadzone
    result.navDx = pad.right ? 1 : pad.left ? -1 : 0;
    result.navDy = pad.down ? 1 : pad.up ? -1 : 0;
    if (result.navDx === 0 && Math.abs(pad.leftStick.x) > NAV_DEADZONE) {
      result.navDx = pad.leftStick.x > 0 ? 1 : -1;
    }
    if (result.navDy === 0 && Math.abs(pad.leftStick.y) > NAV_DEADZONE) {
      result.navDy = pad.leftStick.y > 0 ? 1 : -1;
    }

    // Edge-detected buttons — check BEFORE updating prevButtons
    const pressed = (idx: number) => pad.buttons[idx]?.pressed ?? false;
    const justPressed = (idx: number) => pressed(idx) && !(this.prevButtons[idx] ?? false);

    if (justPressed(0)) { map.confirm = true; result.anyJustPressed = true; }
    if (justPressed(1)) { map.back = true; result.anyJustPressed = true; }
    if (justPressed(9)) { map.menu = true; result.anyJustPressed = true; }
    if (justPressed(3)) { map.reroll = true; result.anyJustPressed = true; }

    // Check remaining buttons for anyJustPressed
    if (!result.anyJustPressed) {
      for (let i = 0; i < pad.buttons.length; i++) {
        if (justPressed(i)) { result.anyJustPressed = true; break; }
      }
    }

    // Update prev state for next frame
    for (let i = 0; i < pad.buttons.length; i++) {
      this.prevButtons[i] = pressed(i);
    }
  }

  private getPad(): Phaser.Input.Gamepad.Gamepad | null {
    for (const scene of this.game.scene.getScenes(true)) {
      const pad = scene.input.gamepad?.pad1;
      if (pad) return pad;
    }
    return null;
  }

  destroy(): void {
    // No DOM listeners to clean up
  }
}
