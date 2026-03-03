import Phaser from 'phaser';
import { WeaponType } from '../shared';
import type { Player } from '../entities/Player';
import type { EnemyPool } from './EnemyPool';
import type { DamageNumberSystem } from '../ui/DamageNumber';
import type { WeaponContext } from './weapons/WeaponContext';
import type { BaseWeapon } from './weapons/BaseWeapon';
import { createWeapon } from './weapons/WeaponRegistry';

export class WeaponSystem {
  private scene: Phaser.Scene;
  private projectilePool: Phaser.GameObjects.Sprite[] = [];
  private forceFieldGfx: Phaser.GameObjects.Graphics;
  private forceFieldTickTimer = 0;
  private weaponMap = new Map<WeaponType, BaseWeapon>();
  private ctx: WeaponContext;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.forceFieldGfx = scene.add.graphics();
    this.forceFieldGfx.setDepth(8);

    for (let i = 0; i < 50; i++) {
      const s = scene.add.sprite(-1000, -1000, 'projectile');
      s.setVisible(false);
      s.setDepth(7);
      this.projectilePool.push(s);
    }

    this.ctx = {
      scene,
      enemyPool: null!,
      damageNumbers: null!,
      forceFieldGfx: this.forceFieldGfx,
      forceFieldDoTick: false,
      getProjectileSprite: (texture: string) => this.getProjectileSprite(texture),
      returnProjectileSprite: (sprite: Phaser.GameObjects.Sprite) => this.returnProjectileSprite(sprite),
    };
  }

  update(dt: number, player: Player, enemyPool: EnemyPool, damageNumbers: DamageNumberSystem): void {
    this.ctx.enemyPool = enemyPool;
    this.ctx.damageNumbers = damageNumbers;

    // Prepare force field shared state for this frame
    this.forceFieldGfx.clear();
    this.forceFieldTickTimer += dt * 1000;
    this.ctx.forceFieldDoTick = this.forceFieldTickTimer >= 200;
    if (this.ctx.forceFieldDoTick) this.forceFieldTickTimer -= 200;

    for (const weapon of player.state.weapons) {
      const weaponSystem = this.getOrCreate(weapon.type);
      weaponSystem.update(dt, player, weapon);
    }
  }

  private getOrCreate(type: WeaponType): BaseWeapon {
    let w = this.weaponMap.get(type);
    if (!w) {
      w = createWeapon(type, this.ctx);
      this.weaponMap.set(type, w);
    }
    return w;
  }

  private getProjectileSprite(texture: string): Phaser.GameObjects.Sprite {
    if (this.projectilePool.length > 0) {
      const s = this.projectilePool.pop()!;
      s.setTexture(texture);
      s.setVisible(true);
      return s;
    }
    const s = this.scene.add.sprite(-1000, -1000, texture);
    s.setDepth(7);
    return s;
  }

  private returnProjectileSprite(sprite: Phaser.GameObjects.Sprite): void {
    sprite.setVisible(false);
    this.projectilePool.push(sprite);
  }

  destroy(): void {
    for (const w of this.weaponMap.values()) w.destroy();
    for (const s of this.projectilePool) s.destroy();
    this.forceFieldGfx.destroy();
  }
}
