import Phaser from 'phaser';
import { SpawnManager, type TileMap, isWalkable, TILE_SIZE } from '../shared';
import { EnemyPool } from './EnemyPool';

/**
 * Client-side spawn controller wrapping the shared SpawnManager.
 * Calculates spawn range from the camera viewport so enemies
 * always appear just outside the visible screen edges.
 */
export class SpawnController {
  private spawnManager: SpawnManager;
  private enemyPool: EnemyPool;
  private map: TileMap;
  private scene: Phaser.Scene;

  constructor(scene: Phaser.Scene, seed: number, enemyPool: EnemyPool, map: TileMap) {
    this.scene = scene;
    this.spawnManager = new SpawnManager(seed);
    this.enemyPool = enemyPool;
    this.map = map;
  }

  update(deltaMs: number, playerX: number, playerY: number): void {
    // Calculate spawn range from viewport size
    const cam = this.scene.cameras.main;
    const halfW = cam.worldView.width / 2;
    const halfH = cam.worldView.height / 2;
    // Diagonal half-extent = distance from center to corner
    const viewRadius = Math.sqrt(halfW * halfW + halfH * halfH);
    const spawnMin = viewRadius + 32;  // just outside screen edge
    const spawnMax = viewRadius + 300; // spread zone beyond edge

    const events = this.spawnManager.update(deltaMs, playerX, playerY, spawnMin, spawnMax);

    for (const event of events) {
      // Check that spawn position is walkable
      const tx = Math.floor(event.worldX / TILE_SIZE);
      const ty = Math.floor(event.worldY / TILE_SIZE);
      if (!isWalkable(this.map, tx, ty)) continue;

      this.enemyPool.spawn(event.enemyType, event.worldX, event.worldY, this.spawnManager.getGameTimeMs());
    }
  }

}
