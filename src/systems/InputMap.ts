import type { Vec2 } from '../types';

/**
 * Plain data snapshot of all input intent for a single frame.
 * No methods, no Phaser references — any system can read this.
 */
export interface InputMap {
  /** Analog movement vector, normalized (-1..1). Keyboard/gamepad/touch. */
  move: Vec2;
  /** Discrete menu nav direction (-1/0/+1), edge-detected with repeat delay. */
  nav: Vec2;

  /** Enter, Space, gamepad A — edge-detected. */
  confirm: boolean;
  /** Escape, gamepad B — edge-detected. */
  back: boolean;
  /** Escape, gamepad Start — edge-detected (pause toggle). */
  menu: boolean;

  /** Which number key (1-9) was just pressed, or 0. */
  numberPressed: number;
  /** R key, gamepad Y — edge-detected. */
  reroll: boolean;
  /** E key — edge-detected. */
  skip: boolean;

  /** Discrete scroll direction: -1 (up), 0, +1 (down). Same as nav.y. */
  scrollY: number;

  /** True if ANY key or button just transitioned to down this frame. */
  anyJustPressed: boolean;
  /** True if an HTML input/textarea/select currently has focus. */
  htmlInputFocused: boolean;
}

export function emptyInputMap(): InputMap {
  return {
    move: { x: 0, y: 0 },
    nav: { x: 0, y: 0 },
    confirm: false,
    back: false,
    menu: false,
    numberPressed: 0,
    reroll: false,
    skip: false,
    scrollY: 0,
    anyJustPressed: false,
    htmlInputFocused: false,
  };
}
