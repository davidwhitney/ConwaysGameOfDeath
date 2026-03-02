export class CellularAutomaton {
  readonly width: number;
  readonly height: number;
  private grid: Uint8Array;
  private buffer: Uint8Array;
  private birthRules: boolean[];
  private survivalRules: boolean[];
  private wrap: boolean;

  constructor(
    width: number,
    height: number,
    birthRules: number[],
    survivalRules: number[],
    wrap: boolean = false,
  ) {
    this.width = width;
    this.height = height;
    this.grid = new Uint8Array(width * height);
    this.buffer = new Uint8Array(width * height);
    this.wrap = wrap;

    // Convert rule arrays to lookup tables
    this.birthRules = new Array(9).fill(false);
    this.survivalRules = new Array(9).fill(false);
    for (const n of birthRules) this.birthRules[n] = true;
    for (const n of survivalRules) this.survivalRules[n] = true;
  }

  /** Fill grid randomly using a fill probability */
  randomize(fillChance: number, rng: () => number): void {
    for (let i = 0; i < this.grid.length; i++) {
      this.grid[i] = rng() < fillChance ? 1 : 0;
    }
  }

  /** Set a specific cell */
  set(x: number, y: number, value: number): void {
    if (x >= 0 && x < this.width && y >= 0 && y < this.height) {
      this.grid[y * this.width + x] = value;
    }
  }

  /** Get a specific cell */
  get(x: number, y: number): number {
    if (this.wrap) {
      x = ((x % this.width) + this.width) % this.width;
      y = ((y % this.height) + this.height) % this.height;
    } else if (x < 0 || x >= this.width || y < 0 || y >= this.height) {
      return 1; // Treat out-of-bounds as walls (for cave gen)
    }
    return this.grid[y * this.width + x];
  }

  /** Count alive neighbors (Moore neighborhood, 8 surrounding cells) */
  private countNeighbors(x: number, y: number): number {
    let count = 0;
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        if (dx === 0 && dy === 0) continue;
        count += this.get(x + dx, y + dy);
      }
    }
    return count;
  }

  /** Run one generation step */
  step(): void {
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        const idx = y * this.width + x;
        const neighbors = this.countNeighbors(x, y);
        const alive = this.grid[idx] === 1;

        if (alive) {
          this.buffer[idx] = this.survivalRules[neighbors] ? 1 : 0;
        } else {
          this.buffer[idx] = this.birthRules[neighbors] ? 1 : 0;
        }
      }
    }
    // Swap buffers
    [this.grid, this.buffer] = [this.buffer, this.grid];
  }

  /** Run multiple steps */
  run(steps: number): void {
    for (let i = 0; i < steps; i++) {
      this.step();
    }
  }

  /** Get the raw grid data */
  getData(): Uint8Array {
    return this.grid;
  }

  /** Clone the grid data */
  cloneData(): Uint8Array {
    return new Uint8Array(this.grid);
  }

  /** Place a pattern at a position (for GoL spawning) */
  placePattern(pattern: number[][], px: number, py: number): void {
    for (let y = 0; y < pattern.length; y++) {
      for (let x = 0; x < pattern[y].length; x++) {
        this.set(px + x, py + y, pattern[y][x]);
      }
    }
  }

  /** Get all alive cells as coordinate list */
  getAliveCells(): Array<{ x: number; y: number }> {
    const cells: Array<{ x: number; y: number }> = [];
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        if (this.grid[y * this.width + x] === 1) {
          cells.push({ x, y });
        }
      }
    }
    return cells;
  }

  /** Count alive cells */
  aliveCount(): number {
    let count = 0;
    for (let i = 0; i < this.grid.length; i++) {
      count += this.grid[i];
    }
    return count;
  }

  /** Clear the grid */
  clear(): void {
    this.grid.fill(0);
  }
}
