import type Phaser from 'phaser';
import type { EnemyPool } from '../EnemyPool';

export interface WeaponContext {
  scene: Phaser.Scene;
  enemyPool: EnemyPool;
  getProjectileSprite(texture: string): Phaser.GameObjects.Sprite;
  returnProjectileSprite(sprite: Phaser.GameObjects.Sprite): void;
}
