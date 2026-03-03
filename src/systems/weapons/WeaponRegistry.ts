import { WeaponType, WEAPON_DEFS } from '../../shared';
import type { BaseWeapon } from './BaseWeapon';
import type { WeaponContext } from './WeaponContext';

import { BaseMeleeWeapon } from './BaseMeleeWeapon';
import { BaseAoEWeapon } from './BaseAoEWeapon';
import { BaseProjectileWeapon } from './BaseProjectileWeapon';
import { BaseForceFieldWeapon } from './BaseForceFieldWeapon';

import { GarlicWeapon } from './aoe/GarlicWeapon';
import { LightningWeapon } from './aoe/LightningWeapon';
import { MagicMissileWeapon } from './projectile/MagicMissileWeapon';
import { FireballWeapon } from './projectile/FireballWeapon';
import { IceShardWeapon } from './projectile/IceShardWeapon';
import { BoomerangWeapon } from './projectile/BoomerangWeapon';
import { ScytheWeapon } from './projectile/ScytheWeapon';
import { HolyShieldWeapon } from './forcefield/HolyShieldWeapon';
import { VoidFieldWeapon } from './forcefield/VoidFieldWeapon';
import { FrostAuraWeapon } from './forcefield/FrostAuraWeapon';
import { VortexWeapon } from './forcefield/VortexWeapon';

type WeaponConstructor = new (ctx: WeaponContext, def: typeof WEAPON_DEFS[number]) => BaseWeapon;

const WEAPON_CLASS_MAP: Record<WeaponType, WeaponConstructor> = {
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
};

export function createWeapon(type: WeaponType, ctx: WeaponContext): BaseWeapon {
  const Ctor = WEAPON_CLASS_MAP[type];
  const def = WEAPON_DEFS[type];
  return new Ctor(ctx, def);
}
