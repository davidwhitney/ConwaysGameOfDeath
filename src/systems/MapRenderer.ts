import Phaser from 'phaser';
import { type TileMap, TileType } from '../types';
import { TILE_SIZE, MAP_WIDTH, MAP_HEIGHT } from '../constants';

/**
 * Renders the tilemap efficiently by only drawing tiles visible to the camera.
 * Uses sprite pooling to avoid create/destroy churn on camera scroll.
 */
export class MapRenderer {
  private scene: Phaser.Scene;
  private map: TileMap;
  private tileSprites: Map<number, Phaser.GameObjects.Image> = new Map();
  private spritePool: Phaser.GameObjects.Image[] = [];
  private container: Phaser.GameObjects.Container;
  private lastCamX = -999;
  private lastCamY = -999;
  private padding = 2; // extra tiles beyond viewport
  private needed: Set<number> = new Set();

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

    // Reuse Set to avoid per-frame allocation
    this.needed.clear();

    for (let ty = startY; ty <= endY; ty++) {
      for (let tx = startX; tx <= endX; tx++) {
        const key = ty * MAP_WIDTH + tx;
        this.needed.add(key);

        if (!this.tileSprites.has(key)) {
          const tileType = this.map[key];
          const texKey = tileType === TileType.Wall ? 'tile-wall' : 'tile-floor';
          const sprite = this.acquireSprite(texKey, tx * TILE_SIZE + TILE_SIZE / 2, ty * TILE_SIZE + TILE_SIZE / 2);
          this.tileSprites.set(key, sprite);
        }
      }
    }

    // Recycle tiles that are no longer visible
    for (const [key, sprite] of this.tileSprites) {
      if (!this.needed.has(key)) {
        this.releaseSprite(sprite);
        this.tileSprites.delete(key);
      }
    }
  }

  private acquireSprite(texture: string, x: number, y: number): Phaser.GameObjects.Image {
    if (this.spritePool.length > 0) {
      const sprite = this.spritePool.pop()!;
      sprite.setTexture(texture);
      sprite.setPosition(x, y);
      sprite.setVisible(true);
      return sprite;
    }
    const sprite = this.scene.add.image(x, y, texture);
    this.container.add(sprite);
    return sprite;
  }

  private releaseSprite(sprite: Phaser.GameObjects.Image): void {
    sprite.setVisible(false);
    sprite.setPosition(-1000, -1000);
    this.spritePool.push(sprite);
  }

  /** Force full re-render (call after map data mutation) */
  invalidate(): void {
    for (const [, sprite] of this.tileSprites) {
      this.releaseSprite(sprite);
    }
    this.tileSprites.clear();
    this.lastCamX = -999;
    this.lastCamY = -999;
  }

  destroy(): void {
    this.container.destroy(true);
    this.tileSprites.clear();
    this.spritePool.length = 0;
  }
}
