import Phaser from 'phaser';
import { Enemy } from '../entities/Enemy';
import { ENEMY_POOL_INITIAL, ENEMY_MAX_ACTIVE, type TileMap, EnemyType, distanceSq } from '../shared';
import { CameraManager } from './CameraManager';

export class EnemyPool {
  private pool: Enemy[] = [];
  private active: Enemy[] = [];
  private scene: Phaser.Scene;
  private map: TileMap;
  private nextId: number = 1;

  constructor(scene: Phaser.Scene, map: TileMap) {
    this.scene = scene;
    this.map = map;

    // Pre-allocate pool
    for (let i = 0; i < ENEMY_POOL_INITIAL; i++) {
      this.pool.push(new Enemy(scene, map));
    }
  }

  spawn(type: EnemyType, x: number, y: number, gameTimeMs: number, boss: boolean = false): Enemy | null {
    if (this.active.length >= ENEMY_MAX_ACTIVE) return null;

    let enemy: Enemy;
    if (this.pool.length > 0) {
      enemy = this.pool.pop()!;
    } else {
      enemy = new Enemy(this.scene, this.map);
    }

    enemy.activate(this.nextId++, type, x, y, gameTimeMs, boss);
    this.active.push(enemy);
    return enemy;
  }

  update(dt: number, playerX: number, playerY: number): void {
    const despawnRange = CameraManager.viewDiagonalRadius(this.scene.cameras.main) + 400;

    for (let i = this.active.length - 1; i >= 0; i--) {
      const enemy = this.active[i];
      const stillActive = enemy.update(dt, playerX, playerY, despawnRange);
      if (!stillActive) {
        this.active.splice(i, 1);
        this.pool.push(enemy);
      }
    }
  }

  getActive(): readonly Enemy[] {
    return this.active;
  }

  getActiveCount(): number {
    return this.active.length;
  }

  /** Remove a specific enemy (when killed) and return it to pool */
  returnToPool(enemy: Enemy): void {
    const idx = this.active.indexOf(enemy);
    if (idx !== -1) {
      this.active.splice(idx, 1);
      enemy.deactivate();
      this.pool.push(enemy);
    }
  }

  /** Destroy all pooled and active enemy sprites */
  destroy(): void {
    for (const enemy of this.active) {
      enemy.sprite.destroy();
    }
    for (const enemy of this.pool) {
      enemy.sprite.destroy();
    }
    this.active.length = 0;
    this.pool.length = 0;
  }

  /** Deactivate all enemies except Death, return count cleared */
  clearNonDeath(): number {
    let cleared = 0;
    for (let i = this.active.length - 1; i >= 0; i--) {
      const enemy = this.active[i];
      if (enemy.state.type === EnemyType.Death) continue;
      enemy.deactivate();
      this.active.splice(i, 1);
      this.pool.push(enemy);
      cleared++;
    }
    return cleared;
  }

  /** Get enemies near a point (brute force, use SpatialHash for better perf) */
  getEnemiesInRadius(x: number, y: number, radius: number): Enemy[] {
    const r2 = radius * radius;
    const point = { x, y };
    return this.active.filter(e => distanceSq(e.state, point) < r2);
  }
}
