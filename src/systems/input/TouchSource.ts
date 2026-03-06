import type { InputMap } from '../InputMap';
import type { InputSource, InputSourceResult } from './InputSourceResult';

export class TouchSource implements InputSource {
  private touchDown = false;
  private touchJustDown = false;
  private touchOriginX = 0;
  private touchOriginY = 0;
  private touchCurrentX = 0;
  private touchCurrentY = 0;

  private onTouchStart: (e: TouchEvent) => void;
  private onTouchMove: (e: TouchEvent) => void;
  private onTouchEnd: () => void;
  private onMouseDown: () => void;
  private canvas: HTMLCanvasElement;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;

    this.onTouchStart = (e: TouchEvent) => {
      const touch = e.touches[0];
      if (!touch) return;
      this.touchDown = true;
      this.touchJustDown = true;
      this.touchOriginX = touch.clientX;
      this.touchOriginY = touch.clientY;
      this.touchCurrentX = touch.clientX;
      this.touchCurrentY = touch.clientY;
    };
    this.onTouchMove = (e: TouchEvent) => {
      const touch = e.touches[0];
      if (touch && this.touchDown) {
        this.touchCurrentX = touch.clientX;
        this.touchCurrentY = touch.clientY;
      }
    };
    this.onTouchEnd = () => { this.touchDown = false; };
    this.onMouseDown = () => { this.touchJustDown = true; };

    canvas.addEventListener('touchstart', this.onTouchStart);
    canvas.addEventListener('touchmove', this.onTouchMove);
    canvas.addEventListener('touchend', this.onTouchEnd);
    canvas.addEventListener('touchcancel', this.onTouchEnd);
    canvas.addEventListener('mousedown', this.onMouseDown);
  }

  poll(_map: InputMap, result: InputSourceResult): void {
    result.moveDx = 0;
    result.moveDy = 0;
    result.navDx = 0;
    result.navDy = 0;
    result.anyJustPressed = this.touchJustDown;
    this.touchJustDown = false;

    if (!this.touchDown) return;

    const dx = this.touchCurrentX - this.touchOriginX;
    const dy = this.touchCurrentY - this.touchOriginY;
    const len = Math.sqrt(dx * dx + dy * dy);
    if (len > 15) {
      result.moveDx = dx / len;
      result.moveDy = dy / len;
    }
  }

  destroy(): void {
    this.canvas.removeEventListener('touchstart', this.onTouchStart);
    this.canvas.removeEventListener('touchmove', this.onTouchMove);
    this.canvas.removeEventListener('touchend', this.onTouchEnd);
    this.canvas.removeEventListener('touchcancel', this.onTouchEnd);
    this.canvas.removeEventListener('mousedown', this.onMouseDown);
  }
}
