import { SPATIAL_CELL_SIZE } from '../constants';

export interface SpatialEntity {
  id: number;
  x: number;
  y: number;
  radius: number;
}

/**
 * Spatial hash grid for fast collision queries.
 * Divides world into cells and stores entity references.
 * Uses reusable internal buffers to avoid per-query allocations.
 */
export class SpatialHash {
  private cellSize: number;
  private cells: Map<number, SpatialEntity[]>;
  /** Reusable dedup set — cleared on each query */
  private readonly _seen = new Set<number>();
  /** Reusable result buffer — valid only until next query call */
  private readonly _result: SpatialEntity[] = [];

  constructor(cellSize: number = SPATIAL_CELL_SIZE) {
    this.cellSize = cellSize;
    this.cells = new Map();
  }

  private hash(cx: number, cy: number): number {
    // Simple spatial hash combining cell coordinates
    return ((cx * 73856093) ^ (cy * 19349663)) | 0;
  }

  private getCellCoord(value: number): number {
    return Math.floor(value / this.cellSize);
  }

  clear(): void {
    this.cells.clear();
  }

  insert(entity: SpatialEntity): void {
    const minCx = this.getCellCoord(entity.x - entity.radius);
    const maxCx = this.getCellCoord(entity.x + entity.radius);
    const minCy = this.getCellCoord(entity.y - entity.radius);
    const maxCy = this.getCellCoord(entity.y + entity.radius);

    for (let cy = minCy; cy <= maxCy; cy++) {
      for (let cx = minCx; cx <= maxCx; cx++) {
        const key = this.hash(cx, cy);
        let cell = this.cells.get(key);
        if (!cell) {
          cell = [];
          this.cells.set(key, cell);
        }
        cell.push(entity);
      }
    }
  }

  /**
   * Query all entities that could overlap with given circle.
   * WARNING: Returns a shared internal buffer — do NOT hold a reference
   * across calls. Copy the result if needed beyond the current frame.
   */
  query(x: number, y: number, radius: number): readonly SpatialEntity[] {
    const minCx = this.getCellCoord(x - radius);
    const maxCx = this.getCellCoord(x + radius);
    const minCy = this.getCellCoord(y - radius);
    const maxCy = this.getCellCoord(y + radius);

    const seen = this._seen;
    const result = this._result;
    seen.clear();
    result.length = 0;

    for (let cy = minCy; cy <= maxCy; cy++) {
      for (let cx = minCx; cx <= maxCx; cx++) {
        const key = this.hash(cx, cy);
        const cell = this.cells.get(key);
        if (!cell) continue;
        for (const entity of cell) {
          if (!seen.has(entity.id)) {
            seen.add(entity.id);
            result.push(entity);
          }
        }
      }
    }

    return result;
  }

  /** Query and filter to actual circle overlaps */
  queryOverlapping(x: number, y: number, radius: number): SpatialEntity[] {
    const candidates = this.query(x, y, radius);
    const out: SpatialEntity[] = [];
    for (const e of candidates) {
      const dx = e.x - x;
      const dy = e.y - y;
      const rSum = e.radius + radius;
      if (dx * dx + dy * dy < rSum * rSum) out.push(e);
    }
    return out;
  }
}
