import { SpatialHash, type SpatialEntity } from '../shared';

/**
 * Client-side spatial hash wrapper.
 * Re-exports shared SpatialHash with convenience methods for Phaser entities.
 */
export class SpatialHashClient {
  private hash: SpatialHash;

  constructor(cellSize?: number) {
    this.hash = new SpatialHash(cellSize);
  }

  clear(): void {
    this.hash.clear();
  }

  insert(entity: SpatialEntity): void {
    this.hash.insert(entity);
  }

  query(x: number, y: number, radius: number): SpatialEntity[] {
    return this.hash.query(x, y, radius);
  }

  queryOverlapping(x: number, y: number, radius: number): SpatialEntity[] {
    return this.hash.queryOverlapping(x, y, radius);
  }
}
