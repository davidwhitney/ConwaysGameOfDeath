import type { InputMap } from '../InputMap';

/**
 * Per-frame output from a single input source.
 * Reuse a single instance per source to avoid allocation.
 */
export interface InputSourceResult {
  /** Analog movement (-1..1) */
  moveDx: number;
  moveDy: number;
  /** Discrete menu nav direction (-1/0/+1) */
  navDx: number;
  navDy: number;
  /** Whether any button/key just transitioned to pressed */
  anyJustPressed: boolean;
}

export function emptyResult(): InputSourceResult {
  return { moveDx: 0, moveDy: 0, navDx: 0, navDy: 0, anyJustPressed: false };
}

/**
 * Common interface for all input sources.
 * Each source owns its DOM listeners and internal state.
 */
export interface InputSource {
  /** Poll current state, writing actions to map and movement/nav to result. */
  poll(map: InputMap, result: InputSourceResult): void;
  /** Clean up DOM listeners */
  destroy(): void;
}
