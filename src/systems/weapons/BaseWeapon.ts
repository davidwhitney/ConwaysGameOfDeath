import { type WeaponDef, type WeaponInstance, type WeaponType, EffectType, getWeaponStats } from '../../shared';
import { CRIT_DAMAGE_MULTIPLIER } from '../../shared/constants';
import type { Player } from '../../entities/Player';
import type { Enemy } from '../../entities/Enemy';
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

  protected hitEnemy(enemy: Enemy, damage: number, weaponType: WeaponType, player: Player): void {
    const critChance = player.getEffectValue(EffectType.Luck);
    let finalDamage = damage;
    let isCrit = false;
    if (critChance > 0 && Math.random() < critChance) {
      isCrit = true;
      finalDamage = Math.floor(damage * (CRIT_DAMAGE_MULTIPLIER + critChance));
    }
    const killed = enemy.takeDamage(finalDamage);
    this.ctx.damageNumbers.show(enemy.state.x, enemy.state.y - 15, finalDamage, isCrit ? '#ff2222' : '#ffffff', isCrit);
    if (killed) {
      this.ctx.scene.events.emit('enemy-killed', enemy, weaponType);
    }
  }

  protected findNearestEnemy(px: number, py: number): Enemy | null {
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
