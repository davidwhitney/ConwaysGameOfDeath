import type Phaser from 'phaser';
import { DOM_INPUT_STYLE } from './textStyles';

/** Create an absolutely-positioned <input> over the canvas, wired for focus/blur keyboard toggling. */
export function createOverlayInput(
  scene: Phaser.Scene,
  type: string,
  styleOverrides?: Partial<CSSStyleDeclaration>,
): HTMLInputElement {
  const input = document.createElement('input');
  input.type = type;
  Object.assign(input.style, { position: 'absolute', ...DOM_INPUT_STYLE, ...styleOverrides });
  input.addEventListener('focus', () => { scene.input.keyboard!.enabled = false; });
  input.addEventListener('blur', () => { scene.input.keyboard!.enabled = true; });
  scene.game.canvas.parentElement!.appendChild(input);
  return input;
}

/** Create an absolutely-positioned <div> container over the canvas. */
export function createOverlayContainer(
  scene: Phaser.Scene,
  styleOverrides?: Partial<CSSStyleDeclaration>,
): HTMLDivElement {
  const div = document.createElement('div');
  Object.assign(div.style, { position: 'absolute', zIndex: '10', ...styleOverrides });
  scene.game.canvas.parentElement!.appendChild(div);
  return div;
}

/** Position an HTML element relative to the canvas rect using fractional coordinates. */
export function positionAtLayout(
  el: HTMLElement,
  canvas: HTMLCanvasElement,
  fracX: number,
  fracY: number,
  offsetX = 0,
): void {
  const rect = canvas.getBoundingClientRect();
  el.style.left = `${rect.left + rect.width * fracX + offsetX}px`;
  el.style.top = `${rect.top + rect.height * fracY}px`;
}

/** Safely remove nullable HTML elements. */
export function removeElements(...els: (HTMLElement | null | undefined)[]): void {
  for (const el of els) el?.remove();
}
