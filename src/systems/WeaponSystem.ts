import Phaser from 'phaser';
import { WeaponType } from '../types';
import { WEAPON_DEFS } from '../entities/weapons';
import type { GameState } from './GameState';
import type { WeaponContext } from './weapons/WeaponContext';
import type { BaseWeapon } from './weapons/BaseWeapon';
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
import { BaseForceFieldWeapon } from './weapons/BaseForceFieldWeapon';
import { BaseProjectileWeapon } from './weapons/BaseProjectileWeapon';
import { QuakeWeapon } from './weapons/aoe/QuakeWeapon';
import { PlagueWeapon } from './weapons/aoe/PlagueWeapon';
import { BloodAuraWeapon } from './weapons/forcefield/BloodAuraWeapon';
import { GravityWellWeapon } from './weapons/forcefield/GravityWellWeapon';
import { GameSystem } from './GameSystem';

type WeaponConstructor = new (ctx: WeaponContext, def: typeof WEAPON_DEFS[number]) => BaseWeapon;

export class WeaponSystem implements GameSystem {
  private scene: Phaser.Scene;
  private projectilePool: Phaser.GameObjects.Sprite[] = [];
  private weaponMap = new Map<WeaponType, BaseWeapon>();
  private ctx: WeaponContext;

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
    [WeaponType.MagicMissile]: BaseProjectileWeapon,
    [WeaponType.Fireball]: BaseProjectileWeapon,
    [WeaponType.IceShard]: BaseProjectileWeapon,
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
    [WeaponType.Shuriken]: BaseProjectileWeapon,
    [WeaponType.DeathRay]: BaseProjectileWeapon,
    [WeaponType.BoneToss]: BaseProjectileWeapon,

    // New Force Field
    [WeaponType.BloodAura]: BloodAuraWeapon,
    [WeaponType.GravityWell]: GravityWellWeapon,
  };

  private gameState: GameState | null = null;

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
      get enemyPool() { return self.gameState!.enemyPool; },
      getProjectileSprite: (texture: string) => this.getProjectileSprite(texture),
      returnProjectileSprite: (sprite: Phaser.GameObjects.Sprite) => this.returnProjectileSprite(sprite),
      get activeGems() { return self.gameState?.activeGems ?? []; },
    };
  }

  update(state: GameState): void {
    this.gameState = state;
    for (const weapon of state.player.state.weapons) {
      const weaponSystem = this.getOrCreate(weapon.type);
      weaponSystem.update(state.time.delta, state.player, weapon);
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
