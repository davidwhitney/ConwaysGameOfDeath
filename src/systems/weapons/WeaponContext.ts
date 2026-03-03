import type Phaser from 'phaser';
import type { WeaponType } from '../../shared';
import type { Enemy } from '../../entities/Enemy';
import type { EnemyPool } from '../EnemyPool';

export interface WeaponContext {
  scene: Phaser.Scene;
  enemyPool: EnemyPool;
  // Shared resources
  getProjectileSprite(texture: string): Phaser.GameObjects.Sprite;
  returnProjectileSprite(sprite: Phaser.GameObjects.Sprite): void;
  hitEnemy(enemy: Enemy, damage: number, weaponType: WeaponType): void;
  findNearestEnemy(px: number, py: number): Enemy | null;
  forceFieldGfx: Phaser.GameObjects.Graphics;
  forceFieldDoTick: boolean;
}
