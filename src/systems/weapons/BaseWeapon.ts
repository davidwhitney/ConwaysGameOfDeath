import { type WeaponDef, type WeaponInstance, getWeaponStats } from '../../shared';
import type { Player } from '../../entities/Player';
import type { WeaponContext } from './WeaponContext';

export abstract class BaseWeapon {
  protected ctx: WeaponContext;
  protected def: WeaponDef;

  constructor(ctx: WeaponContext, def: WeaponDef) {
    this.ctx = ctx;
    this.def = def;
  }

  protected getStats(weapon: WeaponInstance) {
    return getWeaponStats(this.def, weapon.level);
  }

  protected getCooldown(weapon: WeaponInstance, player: Player): number {
    const stats = this.getStats(weapon);
    return stats.cooldown * (1 - player.getCooldownReduction());
  }

  update(dt: number, player: Player, weapon: WeaponInstance): void {
    weapon.cooldownTimer -= dt * 1000;
    if (weapon.cooldownTimer <= 0) {
      this.fire(weapon, player);
      weapon.cooldownTimer = this.getCooldown(weapon, player);
    }
    this.updateActive(dt, player);
  }

  protected fire(_weapon: WeaponInstance, _player: Player): void {}
  protected updateActive(_dt: number, _player: Player): void {}
  abstract destroy(): void;
}
