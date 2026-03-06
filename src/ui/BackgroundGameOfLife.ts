import Phaser from 'phaser';

const CELL_SIZE = 8;
const STEP_MS = 150;
const FILL_COLOR = 0x222244;
const FILL_ALPHA = 0.4;
const ALIVE_CHANCE = 0.25;

export class BackgroundGameOfLife {
  private cols: number;
  private rows: number;
  private cells: Uint8Array;
  private next: Uint8Array;
  private gfx: Phaser.GameObjects.Graphics;
  private timer = 0;

  constructor(scene: Phaser.Scene, width: number, height: number, depth = -10) {
    this.cols = Math.ceil(width / CELL_SIZE);
    this.rows = Math.ceil(height / CELL_SIZE);
    const total = this.cols * this.rows;
    this.cells = new Uint8Array(total);
    this.next = new Uint8Array(total);

    for (let i = 0; i < total; i++) {
      this.cells[i] = Math.random() < ALIVE_CHANCE ? 1 : 0;
    }

    this.gfx = scene.add.graphics().setDepth(depth);
    this.draw();
  }

  update(delta: number): void {
    this.timer += delta;
    if (this.timer >= STEP_MS) {
      this.timer -= STEP_MS;
      this.step();
      this.draw();
    }
  }

  private step(): void {
    const { cols, rows, cells, next } = this;
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        let neighbors = 0;
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            if (dx === 0 && dy === 0) continue;
            const nx = (x + dx + cols) % cols;
            const ny = (y + dy + rows) % rows;
            neighbors += cells[ny * cols + nx];
          }
        }
        const idx = y * cols + x;
        const alive = cells[idx];
        next[idx] = (alive && (neighbors === 2 || neighbors === 3)) || (!alive && neighbors === 3) ? 1 : 0;
      }
    }
    this.cells = this.next;
    this.next = cells;
  }

  private draw(): void {
    this.gfx.clear();
    this.gfx.fillStyle(FILL_COLOR, FILL_ALPHA);
    const { cols, rows, cells } = this;
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        if (cells[y * cols + x]) {
          this.gfx.fillRect(x * CELL_SIZE, y * CELL_SIZE, CELL_SIZE - 1, CELL_SIZE - 1);
        }
      }
    }
  }
}
