import Phaser from 'phaser';
import { TILE_SIZE, MAP_WIDTH, MAP_HEIGHT, type TileMap, TileType } from '../shared';

/**
 * Renders the tilemap efficiently by only drawing tiles visible to the camera.
 * Uses a chunk-based approach for performance.
 */
export class MapRenderer {
  private scene: Phaser.Scene;
  private map: TileMap;
  private tileSprites: Map<number, Phaser.GameObjects.Image> = new Map();
  private container: Phaser.GameObjects.Container;
  private lastCamX = -999;
  private lastCamY = -999;
  private padding = 2; // extra tiles beyond viewport

  constructor(scene: Phaser.Scene, map: TileMap) {
    this.scene = scene;
    this.map = map;
    this.container = scene.add.container(0, 0);
    this.container.setDepth(-10);
  }

  update(camera: Phaser.Cameras.Scene2D.Camera): void {
    const view = camera.worldView;
    const camTileX = Math.floor(view.x / TILE_SIZE);
    const camTileY = Math.floor(view.y / TILE_SIZE);

    // Only rebuild if camera moved enough
    if (Math.abs(camTileX - this.lastCamX) < 1 && Math.abs(camTileY - this.lastCamY) < 1) {
      return;
    }
    this.lastCamX = camTileX;
    this.lastCamY = camTileY;

    const startX = Math.max(0, camTileX - this.padding);
    const startY = Math.max(0, camTileY - this.padding);
    const endX = Math.min(MAP_WIDTH - 1, camTileX + Math.ceil(view.width / TILE_SIZE) + this.padding);
    const endY = Math.min(MAP_HEIGHT - 1, camTileY + Math.ceil(view.height / TILE_SIZE) + this.padding);

    // Track which tiles we need
    const needed = new Set<number>();

    for (let ty = startY; ty <= endY; ty++) {
      for (let tx = startX; tx <= endX; tx++) {
        const key = ty * MAP_WIDTH + tx;
        needed.add(key);

        if (!this.tileSprites.has(key)) {
          const tileType = this.map[key];
          const texKey = tileType === TileType.Wall ? 'tile-wall' : 'tile-floor';
          const sprite = this.scene.add.image(tx * TILE_SIZE + TILE_SIZE / 2, ty * TILE_SIZE + TILE_SIZE / 2, texKey);
          this.container.add(sprite);
          this.tileSprites.set(key, sprite);
        }
      }
    }

    // Remove tiles that are no longer visible
    for (const [key, sprite] of this.tileSprites) {
      if (!needed.has(key)) {
        sprite.destroy();
        this.tileSprites.delete(key);
      }
    }
  }

  /** Force full re-render (call after map data mutation) */
  invalidate(): void {
    for (const [, sprite] of this.tileSprites) {
      sprite.destroy();
    }
    this.tileSprites.clear();
    this.lastCamX = -999;
    this.lastCamY = -999;
  }

  destroy(): void {
    this.container.destroy(true);
    this.tileSprites.clear();
  }
}
