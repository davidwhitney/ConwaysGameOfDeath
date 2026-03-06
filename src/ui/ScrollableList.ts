import Phaser from 'phaser';
import { InputSystem } from '../systems/InputSystem';

/**
 * Reusable scrollable container with mouse wheel, touch drag,
 * and keyboard/gamepad scroll support.
 */
export class ScrollableList {
  private scene: Phaser.Scene;
  readonly container: Phaser.GameObjects.Container;
  private _scrollY = 0;
  private _maxScroll: number;
  private listTop: number;
  private listH: number;
  private rowH: number;

  constructor(scene: Phaser.Scene, listTop: number, listBottom: number, contentH: number, rowH: number) {
    this.scene = scene;
    this.listTop = listTop;
    this.listH = listBottom - listTop;
    this.rowH = rowH;
    this._maxScroll = Math.max(0, contentH - this.listH);
    this.container = scene.add.container(0, listTop);

    // Clip mask
    const { width } = scene.cameras.main;
    const maskShape = scene.add.rectangle(width / 2, listTop + this.listH / 2, width, this.listH, 0x000000).setVisible(false);
    this.container.setMask(maskShape.createGeometryMask());

    // Mouse wheel
    scene.input.on('wheel', (_p: unknown, _go: unknown[], _dx: number, dy: number) => {
      this.scrollTo(this._scrollY + dy * 0.5);
    });

    // Touch drag
    let dragStartY = 0;
    let dragStartScroll = 0;
    scene.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      dragStartY = pointer.y;
      dragStartScroll = this._scrollY;
    });
    scene.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (!pointer.isDown) return;
      this.scrollTo(dragStartScroll + (dragStartY - pointer.y));
    });
  }

  /** Process keyboard/gamepad scroll input. Call from scene update(). */
  updateScroll(): void {
    const input = InputSystem.current;
    if (input.scrollY !== 0) {
      this.scrollTo(this._scrollY + input.scrollY * this.rowH);
    }
  }

  /** Ensure a given row index is visible, scrolling if needed. */
  scrollToRow(index: number): void {
    const rowTop = index * this.rowH;
    if (rowTop < this._scrollY) {
      this.scrollTo(rowTop);
    } else if (rowTop + this.rowH > this._scrollY + this.listH) {
      this.scrollTo(rowTop + this.rowH - this.listH);
    }
  }

  get scrollY(): number {
    return this._scrollY;
  }

  get maxScroll(): number {
    return this._maxScroll;
  }

  private scrollTo(y: number): void {
    this._scrollY = Phaser.Math.Clamp(y, 0, this._maxScroll);
    this.container.y = this.listTop - this._scrollY;
  }
}
