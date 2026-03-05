import Phaser from 'phaser';
import { WeaponType } from '../types';
import { WEAPON_DEFS } from '../entities/weapons';
import type { UpdateContext } from './UpdateContext';
import type { WeaponContext } from './weapons/WeaponContext';
import type { BaseWeapon } from './weapons/BaseWeapon';
import type { EnemyPool } from './EnemyPool';
import { BoomerangWeapon } from './weapons/projectile/BoomerangWeapon';
import { ScytheWeapon } from './weapons/projectile/ScytheWeapon';
import { HolyShieldWeapon } from './weapons/forcefield/HolyShieldWeapon';
import { VoidFieldWeapon } from './weapons/forcefield/VoidFieldWeapon';
import { FrostAuraWeapon } from './weapons/forcefield/FrostAuraWeapon';
import { VortexWeapon } from './weapons/forcefield/VortexWeapon';
import { BaseMeleeWeapon } from './weapons/BaseMeleeWeapon';
import { GarlicWeapon } from './weapons/aoe/GarlicWeapon';
import { BaseAoEWeapon } from './weapons/BaseAoEWeapon';
import { LightningWeapon } from './weapons/aoe/LightningWeapon';
import { MagicMissileWeapon } from './weapons/projectile/MagicMissileWeapon';
import { FireballWeapon } from './weapons/projectile/FireballWeapon';
import { IceShardWeapon } from './weapons/projectile/IceShardWeapon';
import { BaseForceFieldWeapon } from './weapons/BaseForceFieldWeapon';
import { ShurikenWeapon } from './weapons/projectile/ShurikenWeapon';
import { DeathRayWeapon } from './weapons/projectile/DeathRayWeapon';
import { BoneTossWeapon } from './weapons/projectile/BoneTossWeapon';
import { QuakeWeapon } from './weapons/aoe/QuakeWeapon';
import { PlagueWeapon } from './weapons/aoe/PlagueWeapon';
import { BloodAuraWeapon } from './weapons/forcefield/BloodAuraWeapon';
import { GravityWellWeapon } from './weapons/forcefield/GravityWellWeapon';
import { BaseProjectileWeapon } from './weapons/BaseProjectileWeapon';
import { GameSystem } from './GameSystem';

type WeaponConstructor = new (ctx: WeaponContext, def: typeof WEAPON_DEFS[number]) => BaseWeapon;

export class WeaponSystem implements GameSystem {
  private scene: Phaser.Scene;
  private projectilePool: Phaser.GameObjects.Sprite[] = [];
  private weaponMap = new Map<WeaponType, BaseWeapon>();
  private ctx: WeaponContext;
  private currentEnemyPool: EnemyPool | null = null;

  private WEAPON_CLASS_MAP: Record<WeaponType, WeaponConstructor> = {
    // Melee — all use default base
    [WeaponType.Whip]: BaseMeleeWeapon,
    [WeaponType.Sword]: BaseMeleeWeapon,
    [WeaponType.Axe]: BaseMeleeWeapon,
    [WeaponType.Knife]: BaseMeleeWeapon,
    [WeaponType.Cross]: BaseMeleeWeapon,

    // AoE
    [WeaponType.Garlic]: GarlicWeapon,
    [WeaponType.HolyWater]: BaseAoEWeapon,
    [WeaponType.FireWand]: BaseAoEWeapon,
    [WeaponType.Lightning]: LightningWeapon,
    [WeaponType.Meteor]: BaseAoEWeapon,

    // Projectile
    [WeaponType.MagicMissile]: MagicMissileWeapon,
    [WeaponType.Fireball]: FireballWeapon,
    [WeaponType.IceShard]: IceShardWeapon,
    [WeaponType.Boomerang]: BoomerangWeapon,
    [WeaponType.Scythe]: ScytheWeapon,

    // Force field
    [WeaponType.HolyShield]: HolyShieldWeapon,
    [WeaponType.FrostAura]: FrostAuraWeapon,
    [WeaponType.PoisonCloud]: BaseForceFieldWeapon,
    [WeaponType.ThunderRing]: BaseForceFieldWeapon,
    [WeaponType.VoidField]: VoidFieldWeapon,
    [WeaponType.VoidBurn]: BaseForceFieldWeapon,
    [WeaponType.Vortex]: VortexWeapon,

    // New Melee
    [WeaponType.Spear]: BaseMeleeWeapon,
    [WeaponType.Mace]: BaseMeleeWeapon,

    // New AoE
    [WeaponType.Quake]: QuakeWeapon,
    [WeaponType.SpiritBomb]: BaseAoEWeapon,
    [WeaponType.PlagueCloud]: PlagueWeapon,

    // New Projectile
    [WeaponType.Shuriken]: ShurikenWeapon,
    [WeaponType.DeathRay]: DeathRayWeapon,
    [WeaponType.BoneToss]: BoneTossWeapon,

    // New Force Field
    [WeaponType.BloodAura]: BloodAuraWeapon,
    [WeaponType.GravityWell]: GravityWellWeapon,
  };

  constructor(scene: Phaser.Scene) {
    this.scene = scene;

    for (let i = 0; i < 50; i++) {
      const s = scene.add.sprite(-1000, -1000, 'projectile');
      s.setVisible(false);
      s.setDepth(7);
      this.projectilePool.push(s);
    }

    const self = this;
    this.ctx = {
      scene,
      get enemyPool(): EnemyPool {
        if (!self.currentEnemyPool) throw new Error('WeaponSystem: enemyPool accessed before update');
        return self.currentEnemyPool;
      },
      getProjectileSprite: (texture: string) => this.getProjectileSprite(texture),
      returnProjectileSprite: (sprite: Phaser.GameObjects.Sprite) => this.returnProjectileSprite(sprite),
    };
  }

  update(ctx: UpdateContext): void {
    this.currentEnemyPool = ctx.enemyPool;

    for (const weapon of ctx.player.state.weapons) {
      const weaponSystem = this.getOrCreate(weapon.type);
      weaponSystem.update(ctx.time.delta, ctx.player, weapon);
    }
  }

  private getOrCreate(type: WeaponType): BaseWeapon {
    let w = this.weaponMap.get(type);
    if (!w) {
      const Ctor = this.WEAPON_CLASS_MAP[type];
      const def = WEAPON_DEFS[type];
      w = new Ctor(this.ctx, def);
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
  }
}
