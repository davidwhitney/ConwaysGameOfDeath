import Phaser from 'phaser';
import { Enemy } from '../entities/Enemy';
import { type TileMap, EnemyType } from '../types';
import { ENEMY_POOL_INITIAL, ENEMY_MAX_ACTIVE } from '../constants';
import { distanceSq } from '../utils/math';
import { CameraManager } from './CameraManager';
import { SpatialHash, type SpatialEntity } from './physics';

/** Adapter so Enemy can be inserted into the spatial hash */
interface EnemySpatial extends SpatialEntity {
  enemy: Enemy;
}

export class EnemyPool {
  private pool: Enemy[] = [];
  private active: Enemy[] = [];
  private scene: Phaser.Scene;
  private map: TileMap;
  private nextId: number = 1;
  private hash = new SpatialHash();
  private entityMap: Map<number, Enemy> = new Map();

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
    const despawnRangeSq = despawnRange * despawnRange;
    const now = this.scene.time.now;

    for (let i = this.active.length - 1; i >= 0; i--) {
      const enemy = this.active[i];
      const stillActive = enemy.update(dt, playerX, playerY, despawnRangeSq, now);
      if (!stillActive) {
        this.active.splice(i, 1);
        this.pool.push(enemy);
      }
    }

    // Rebuild spatial hash after all enemies have moved
    this.hash.clear();
    this.entityMap.clear();
    for (const enemy of this.active) {
      if (!enemy.state.alive) continue;
      this.entityMap.set(enemy.state.id, enemy);
      this.hash.insert({
        id: enemy.state.id,
        x: enemy.state.x,
        y: enemy.state.y,
        radius: enemy.effectiveSize,
      });
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

  /** Get enemies near a point using spatial hash */
  getEnemiesInRadius(x: number, y: number, radius: number): Enemy[] {
    const candidates = this.hash.query(x, y, radius);
    const r2 = radius * radius;
    const result: Enemy[] = [];
    for (const c of candidates) {
      const dx = c.x - x;
      const dy = c.y - y;
      if (dx * dx + dy * dy < r2) {
        const enemy = this.entityMap.get(c.id);
        if (enemy) result.push(enemy);
      }
    }
    return result;
  }
}
