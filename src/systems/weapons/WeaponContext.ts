import type Phaser from 'phaser';
import type { EnemyPool } from '../EnemyPool';
import type { DamageNumberSystem } from '../../ui/DamageNumber';

export interface WeaponContext {
  scene: Phaser.Scene;
  enemyPool: EnemyPool;
  damageNumbers: DamageNumberSystem;
  getProjectileSprite(texture: string): Phaser.GameObjects.Sprite;
  returnProjectileSprite(sprite: Phaser.GameObjects.Sprite): void;
  forceFieldGfx: Phaser.GameObjects.Graphics;
  forceFieldDoTick: boolean;
}
