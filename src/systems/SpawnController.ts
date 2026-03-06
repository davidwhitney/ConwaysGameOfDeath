import Phaser from 'phaser';
import type { TileMap } from '../types';
import { TILE_SIZE } from '../constants';
import { SpawnManager } from './spawn-manager';
import { isWalkable } from './map-generator';
import { EnemyPool } from './EnemyPool';
import { CameraManager } from './CameraManager';

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

  constructor(scene: Phaser.Scene, seed: number, enemyPool: EnemyPool, map: TileMap, initialTimeMs: number = 0) {
    this.scene = scene;
    this.spawnManager = new SpawnManager(seed, initialTimeMs);
    this.enemyPool = enemyPool;
    this.map = map;
  }

  update(deltaMs: number, playerX: number, playerY: number): void {
    const viewRadius = CameraManager.viewDiagonalRadius(this.scene.cameras.main);
    const spawnMin = viewRadius + 32;  // just outside screen edge
    const spawnMax = viewRadius + 300; // spread zone beyond edge

    const events = this.spawnManager.update(deltaMs, playerX, playerY, spawnMin, spawnMax);

    for (const event of events) {
      // Check that spawn position is walkable
      const tx = Math.floor(event.worldX / TILE_SIZE);
      const ty = Math.floor(event.worldY / TILE_SIZE);
      if (!isWalkable(this.map, tx, ty)) continue;

      this.enemyPool.spawn(event.enemyType, event.worldX, event.worldY, this.spawnManager.gameTimeMs);
    }
  }

}
