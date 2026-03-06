import Phaser from 'phaser';
import type { InputMap } from './InputMap';
import { emptyInputMap } from './InputMap';

// Keyboard key codes
const K_W = 87, K_A = 65, K_S = 83, K_D = 68;
const K_UP = 38, K_DOWN = 40, K_LEFT = 37, K_RIGHT = 39;
const K_ENTER = 13, K_SPACE = 32, K_ESC = 27;
const K_R = 82, K_E = 69;
const K_1 = 49, K_9 = 57;

const MOVE_DEADZONE = 0.2;
const NAV_DEADZONE = 0.5;
const NAV_REPEAT_DELAY = 200;

export class InputSystem {
  static current: InputMap = emptyInputMap();

  private game: Phaser.Game;

  // Raw keyboard state (DOM-level, scene-independent)
  private keysDown = new Set<number>();
  private keysJustDown = new Set<number>();

  // Gamepad prev-button state for edge detection
  private prevButtons: boolean[] = [];

  // Nav repeat state
  private navPrevX = 0;
  private navPrevY = 0;
  private navRepeatTimerX = 0;
  private navRepeatTimerY = 0;

  // Touch drag state
  private touchDown = false;
  private touchJustDown = false;
  private touchOriginX = 0;
  private touchOriginY = 0;
  private touchCurrentX = 0;
  private touchCurrentY = 0;

  // DOM listeners (stored for cleanup)
  private onKeyDown: (e: KeyboardEvent) => void;
  private onKeyUp: (e: KeyboardEvent) => void;
  private pollBound: () => void;

  constructor(game: Phaser.Game) {
    this.game = game;

    // Listen on DOM for keyboard — independent of scene lifecycle
    this.onKeyDown = (e: KeyboardEvent) => {
      if (!this.keysDown.has(e.keyCode)) {
        this.keysJustDown.add(e.keyCode);
      }
      this.keysDown.add(e.keyCode);
    };
    this.onKeyUp = (e: KeyboardEvent) => {
      this.keysDown.delete(e.keyCode);
    };
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);

    // Touch listeners on the canvas element
    const canvas = game.canvas;
    canvas.addEventListener('touchstart', (e) => {
      const touch = e.touches[0];
      if (!touch) return;
      this.touchDown = true;
      this.touchJustDown = true;
      this.touchOriginX = touch.clientX;
      this.touchOriginY = touch.clientY;
      this.touchCurrentX = touch.clientX;
      this.touchCurrentY = touch.clientY;
    });
    canvas.addEventListener('touchmove', (e) => {
      const touch = e.touches[0];
      if (touch && this.touchDown) {
        this.touchCurrentX = touch.clientX;
        this.touchCurrentY = touch.clientY;
      }
    });
    canvas.addEventListener('touchend', () => { this.touchDown = false; });
    canvas.addEventListener('touchcancel', () => { this.touchDown = false; });

    // Mouse click (desktop) — treat like a touch tap for anyJustPressed
    canvas.addEventListener('mousedown', () => { this.touchJustDown = true; });

    this.pollBound = () => this.poll();
    game.events.on('prestep', this.pollBound);
  }

  /** Get the first connected gamepad (scene-independent). */
  private getPad(): Phaser.Input.Gamepad.Gamepad | null {
    // Access the gamepad manager through the game's input manager
    // Phaser stores gamepads on the InputPlugin, but at runtime
    // we can access connected pads via the navigator API through Phaser's internal manager.
    // The simplest reliable approach: find any active scene that has gamepad enabled.
    for (const scene of this.game.scene.getScenes(true)) {
      const pad = scene.input.gamepad?.pad1;
      if (pad) return pad;
    }
    return null;
  }

  private poll(): void {
    const map = emptyInputMap();
    const now = this.game.loop.now;

    // ── HTML focus check ──
    const tag = document.activeElement?.tagName ?? '';
    map.htmlInputFocused = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';

    // ── Keyboard movement (held) ──
    let kbDx = 0, kbDy = 0;
    if (this.keysDown.has(K_LEFT) || this.keysDown.has(K_A)) kbDx -= 1;
    if (this.keysDown.has(K_RIGHT) || this.keysDown.has(K_D)) kbDx += 1;
    if (this.keysDown.has(K_UP) || this.keysDown.has(K_W)) kbDy -= 1;
    if (this.keysDown.has(K_DOWN) || this.keysDown.has(K_S)) kbDy += 1;

    // ── Gamepad ──
    const pad = this.getPad();
    let gpMoveDx = 0, gpMoveDy = 0;
    let gpNavDx = 0, gpNavDy = 0;
    let gpAnyJustPressed = false;

    if (pad) {
      // Analog stick → movement (low deadzone)
      if (Math.abs(pad.leftStick.x) > MOVE_DEADZONE) gpMoveDx = pad.leftStick.x;
      if (Math.abs(pad.leftStick.y) > MOVE_DEADZONE) gpMoveDy = pad.leftStick.y;

      // D-pad → movement fallback
      if (gpMoveDx === 0 && gpMoveDy === 0) {
        if (pad.left) gpMoveDx = -1;
        if (pad.right) gpMoveDx = 1;
        if (pad.up) gpMoveDy = -1;
        if (pad.down) gpMoveDy = 1;
      }

      // Nav: d-pad first, then stick with higher deadzone
      gpNavDx = pad.right ? 1 : pad.left ? -1 : 0;
      gpNavDy = pad.down ? 1 : pad.up ? -1 : 0;
      if (gpNavDx === 0 && Math.abs(pad.leftStick.x) > NAV_DEADZONE) {
        gpNavDx = pad.leftStick.x > 0 ? 1 : -1;
      }
      if (gpNavDy === 0 && Math.abs(pad.leftStick.y) > NAV_DEADZONE) {
        gpNavDy = pad.leftStick.y > 0 ? 1 : -1;
      }

      // Edge-detected buttons — check BEFORE updating prevButtons
      const pressed = (idx: number) => pad.buttons[idx]?.pressed ?? false;
      const justPressed = (idx: number) => pressed(idx) && !(this.prevButtons[idx] ?? false);

      if (justPressed(0)) { map.confirm = true; gpAnyJustPressed = true; }
      if (justPressed(1)) { map.back = true; gpAnyJustPressed = true; }
      if (justPressed(9)) { map.menu = true; gpAnyJustPressed = true; }
      if (justPressed(3)) { map.reroll = true; gpAnyJustPressed = true; }

      // Check all buttons for anyJustPressed
      if (!gpAnyJustPressed) {
        for (let i = 0; i < pad.buttons.length; i++) {
          if (justPressed(i)) { gpAnyJustPressed = true; break; }
        }
      }

      // NOW update prev state
      for (let i = 0; i < pad.buttons.length; i++) {
        this.prevButtons[i] = pressed(i);
      }
    }

    // ── Touch drag → movement ──
    let touchDx = 0, touchDy = 0;
    if (this.touchDown) {
      const tdx = this.touchCurrentX - this.touchOriginX;
      const tdy = this.touchCurrentY - this.touchOriginY;
      const len = Math.sqrt(tdx * tdx + tdy * tdy);
      if (len > 15) {
        touchDx = tdx / len;
        touchDy = tdy / len;
      }
    }

    // ── Compose movement (priority: keyboard > gamepad > touch) ──
    let mx = kbDx, my = kbDy;
    if (mx === 0 && my === 0) { mx = gpMoveDx; my = gpMoveDy; }
    if (mx === 0 && my === 0) { mx = touchDx; my = touchDy; }

    // Normalize diagonal
    if (mx !== 0 && my !== 0) {
      const len = Math.sqrt(mx * mx + my * my);
      if (len > 1) { mx /= len; my /= len; }
    }
    map.move = { x: mx, y: my };

    // ── Compose nav (keyboard + gamepad, apply repeat) ──
    const rawNavX = kbDx || gpNavDx;
    const rawNavY = kbDy || gpNavDy;

    map.nav.x = this.applyNavRepeat(rawNavX, this.navPrevX, now, 'x');
    this.navPrevX = rawNavX;

    map.nav.y = this.applyNavRepeat(rawNavY, this.navPrevY, now, 'y');
    this.navPrevY = rawNavY;

    map.scrollY = map.nav.y;

    // ── Edge-detected action buttons (keyboard) ──
    if (this.keysJustDown.has(K_ENTER) || this.keysJustDown.has(K_SPACE)) map.confirm = true;
    if (this.keysJustDown.has(K_ESC)) { map.back = true; map.menu = true; }
    if (this.keysJustDown.has(K_R)) map.reroll = true;
    if (this.keysJustDown.has(K_E)) map.skip = true;

    // Number keys
    for (let k = K_1; k <= K_9; k++) {
      if (this.keysJustDown.has(k)) {
        map.numberPressed = k - K_1 + 1;
        break;
      }
    }

    // ── anyJustPressed ──
    map.anyJustPressed = this.keysJustDown.size > 0 || gpAnyJustPressed || this.touchJustDown;

    // Clear per-frame state
    this.keysJustDown.clear();
    this.touchJustDown = false;

    InputSystem.current = map;
  }

  private applyNavRepeat(raw: number, prev: number, now: number, axis: 'x' | 'y'): number {
    if (raw === 0) {
      if (axis === 'x') this.navRepeatTimerX = 0;
      else this.navRepeatTimerY = 0;
      return 0;
    }

    if (raw !== prev) {
      // Direction changed — fire immediately, set repeat timer
      if (axis === 'x') this.navRepeatTimerX = now + NAV_REPEAT_DELAY;
      else this.navRepeatTimerY = now + NAV_REPEAT_DELAY;
      return raw;
    }

    // Same direction held — check repeat timer
    const timer = axis === 'x' ? this.navRepeatTimerX : this.navRepeatTimerY;
    if (now >= timer) {
      if (axis === 'x') this.navRepeatTimerX = now + NAV_REPEAT_DELAY;
      else this.navRepeatTimerY = now + NAV_REPEAT_DELAY;
      return raw;
    }

    return 0;
  }

  destroy(): void {
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
    this.game.events.off('prestep', this.pollBound);
  }
}
