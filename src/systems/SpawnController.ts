import Phaser from 'phaser';
import type { TileMap } from '../types';
import { TILE_SIZE } from '../constants';
import { SpawnManager } from './spawn-manager';
import { isWalkable } from './map-generator';
import type { EnemyPool } from './EnemyPool';
import { CameraManager } from './CameraManager';

/**
 * Client-side spawn controller wrapping the shared SpawnManager.
 * Calculates spawn range from the camera viewport so enemies
 * always appear just outside the visible screen edges.
 */
export class SpawnController {
  private spawnManager: SpawnManager;
  private scene: Phaser.Scene;

  constructor(scene: Phaser.Scene, seed: number, initialTimeMs: number = 0) {
    this.scene = scene;
    this.spawnManager = new SpawnManager(seed, initialTimeMs);
  }

  update(deltaMs: number, playerX: number, playerY: number, enemyPool: EnemyPool, map: TileMap): void {
    const viewRadius = CameraManager.viewDiagonalRadius(this.scene.cameras.main);
    const spawnMin = viewRadius + 32;  // just outside screen edge
    const spawnMax = viewRadius + 300; // spread zone beyond edge

    const events = this.spawnManager.update(deltaMs, playerX, playerY, spawnMin, spawnMax);

    for (const event of events) {
      // Check that spawn position is walkable
      const tx = Math.floor(event.worldX / TILE_SIZE);
      const ty = Math.floor(event.worldY / TILE_SIZE);
      if (!isWalkable(map, tx, ty)) continue;

      enemyPool.spawn(event.enemyType, event.worldX, event.worldY, this.spawnManager.gameTimeMs);
    }
  }

}
