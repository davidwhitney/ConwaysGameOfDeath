import type Phaser from 'phaser';
import type { EnemyPool } from '../EnemyPool';
import type { GemData } from '../../entities/XPGem';

export interface WeaponContext {
  scene: Phaser.Scene;
  enemyPool: EnemyPool;
  getProjectileSprite(texture: string): Phaser.GameObjects.Sprite;
  returnProjectileSprite(sprite: Phaser.GameObjects.Sprite): void;
  readonly activeGems: GemData[];
}
