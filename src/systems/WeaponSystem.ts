import Phaser from 'phaser';
import { WeaponType, EffectType } from '../shared';
import { CRIT_DAMAGE_MULTIPLIER } from '../shared/constants';
import type { Player } from '../entities/Player';
import type { Enemy } from '../entities/Enemy';
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
  private player!: Player;
  private damageNumbers!: DamageNumberSystem;

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
      forceFieldGfx: this.forceFieldGfx,
      forceFieldDoTick: false,
      getProjectileSprite: (texture: string) => this.getProjectileSprite(texture),
      returnProjectileSprite: (sprite: Phaser.GameObjects.Sprite) => this.returnProjectileSprite(sprite),
      hitEnemy: (enemy: Enemy, damage: number, weaponType: WeaponType) => this.hitEnemy(enemy, damage, weaponType),
      findNearestEnemy: (px: number, py: number) => this.findNearestEnemy(px, py),
    };
  }

  update(dt: number, player: Player, enemyPool: EnemyPool, damageNumbers: DamageNumberSystem): void {
    this.player = player;
    this.damageNumbers = damageNumbers;
    this.ctx.enemyPool = enemyPool;

    // Prepare force field shared state for this frame
    this.forceFieldGfx.clear();
    this.forceFieldTickTimer += dt * 1000;
    this.ctx.forceFieldDoTick = this.forceFieldTickTimer >= 200;
    if (this.ctx.forceFieldDoTick) this.forceFieldTickTimer -= 200;

    // Update all weapons
    for (const weapon of player.state.weapons) {
      this.getOrCreate(weapon.type).update(dt, player, weapon);
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

  private findNearestEnemy(px: number, py: number): Enemy | null {
    const enemies = this.ctx.enemyPool.getActive();
    let nearest: Enemy | null = null;
    let nearDist = Infinity;
    for (const e of enemies) {
      const dx = e.state.x - px;
      const dy = e.state.y - py;
      const d = dx * dx + dy * dy;
      if (d < nearDist) { nearDist = d; nearest = e; }
    }
    return nearest;
  }

  private hitEnemy(enemy: Enemy, damage: number, weaponType: WeaponType): void {
    const critChance = this.player.getEffectValue(EffectType.Luck);
    let finalDamage = damage;
    let isCrit = false;
    if (critChance > 0 && Math.random() < critChance) {
      isCrit = true;
      finalDamage = Math.floor(damage * (CRIT_DAMAGE_MULTIPLIER + critChance));
    }
    const killed = enemy.takeDamage(finalDamage);
    this.damageNumbers.show(enemy.state.x, enemy.state.y - 15, finalDamage, isCrit ? '#ff2222' : '#ffffff', isCrit);
    if (killed) {
      this.scene.events.emit('enemy-killed', enemy, weaponType);
    }
  }

  destroy(): void {
    for (const w of this.weaponMap.values()) w.destroy();
    for (const s of this.projectilePool) s.destroy();
    this.forceFieldGfx.destroy();
  }
}
