import Phaser from 'phaser';
import type { InputMap } from './InputMap';
import { emptyInputMap } from './InputMap';
import { KeyboardSource } from './input/KeyboardSource';
import { GamepadSource } from './input/GamepadSource';
import { TouchSource } from './input/TouchSource';
import { emptyResult } from './input/InputSourceResult';

const NAV_REPEAT_DELAY = 200;

export class InputSystem {
  static current: InputMap = emptyInputMap();

  private game: Phaser.Game;
  private keyboard: KeyboardSource;
  private gamepad: GamepadSource;
  private touch: TouchSource;

  private kbResult = emptyResult();
  private gpResult = emptyResult();
  private touchResult = emptyResult();

  // Nav repeat state (shared across sources)
  private navPrevX = 0;
  private navPrevY = 0;
  private navRepeatTimerX = 0;
  private navRepeatTimerY = 0;

  private pollBound: () => void;

  constructor(game: Phaser.Game) {
    this.game = game;
    this.keyboard = new KeyboardSource();
    this.gamepad = new GamepadSource(game);
    this.touch = new TouchSource(game.canvas);

    this.pollBound = () => this.poll();
    game.events.on('prestep', this.pollBound);
  }

  private poll(): void {
    const map = emptyInputMap();

    // HTML focus check
    const tag = document.activeElement?.tagName ?? '';
    map.htmlInputFocused = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';

    // Poll each source
    this.keyboard.poll(map, this.kbResult);
    this.gamepad.poll(map, this.gpResult);
    this.touch.poll(map, this.touchResult);

    // Compose movement (priority: keyboard > gamepad > touch)
    let mx = this.kbResult.moveDx, my = this.kbResult.moveDy;
    if (mx === 0 && my === 0) { mx = this.gpResult.moveDx; my = this.gpResult.moveDy; }
    if (mx === 0 && my === 0) { mx = this.touchResult.moveDx; my = this.touchResult.moveDy; }

    // Normalize diagonal
    if (mx !== 0 && my !== 0) {
      const len = Math.sqrt(mx * mx + my * my);
      if (len > 1) { mx /= len; my /= len; }
    }
    map.move = { x: mx, y: my };

    // Compose nav (keyboard + gamepad, with repeat)
    const now = this.game.loop.now;
    const rawNavX = this.kbResult.navDx || this.gpResult.navDx;
    const rawNavY = this.kbResult.navDy || this.gpResult.navDy;
    map.nav.x = this.applyNavRepeat(rawNavX, this.navPrevX, now, 'x');
    this.navPrevX = rawNavX;
    map.nav.y = this.applyNavRepeat(rawNavY, this.navPrevY, now, 'y');
    this.navPrevY = rawNavY;
    map.scrollY = map.nav.y;

    // anyJustPressed
    map.anyJustPressed = this.kbResult.anyJustPressed || this.gpResult.anyJustPressed || this.touchResult.anyJustPressed;

    InputSystem.current = map;
  }

  private applyNavRepeat(raw: number, prev: number, now: number, axis: 'x' | 'y'): number {
    if (raw === 0) {
      if (axis === 'x') this.navRepeatTimerX = 0;
      else this.navRepeatTimerY = 0;
      return 0;
    }

    if (raw !== prev) {
      if (axis === 'x') this.navRepeatTimerX = now + NAV_REPEAT_DELAY;
      else this.navRepeatTimerY = now + NAV_REPEAT_DELAY;
      return raw;
    }

    const timer = axis === 'x' ? this.navRepeatTimerX : this.navRepeatTimerY;
    if (now >= timer) {
      if (axis === 'x') this.navRepeatTimerX = now + NAV_REPEAT_DELAY;
      else this.navRepeatTimerY = now + NAV_REPEAT_DELAY;
      return raw;
    }

    return 0;
  }

  destroy(): void {
    this.keyboard.destroy();
    this.gamepad.destroy();
    this.touch.destroy();
    this.game.events.off('prestep', this.pollBound);
  }
}
