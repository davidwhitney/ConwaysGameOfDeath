import { type WeaponDef, type WeaponInstance, type WeaponType, EffectType } from '../../shared';
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

  private getWeaponStats(def: WeaponDef, level: number) {
    const lvl = level - 1; // 0-indexed for scaling
    return {
      damage: Math.floor(def.baseDamage * (1 + def.levelScaling.damage * lvl)),
      cooldown: Math.max(100, def.baseCooldown * (1 - def.levelScaling.cooldown * lvl)),
      area: def.baseArea * (1 + def.levelScaling.area * lvl),
      amount: def.baseAmount + lvl * def.levelScaling.amount,
      pierce: def.basePierce + Math.floor((lvl + 1) / 2) * def.levelScaling.pierce,
      duration: def.baseDuration * (1 + def.levelScaling.duration * lvl),
      speed: def.baseSpeed,
    };
  }

  protected getStats(weapon: WeaponInstance) {
    return this.getWeaponStats(this.def, weapon.level);
  }

  protected getCooldown(weapon: WeaponInstance, player: Player): number {
    const stats = this.getStats(weapon);
    return stats.cooldown * (1 - player.getCooldownReduction());
  }

  protected hitEnemy(enemy: Enemy, damage: number, weaponType: WeaponType, player: Player): void {
    // Crit: base from Luck + bonus from CritChance effect
    const critChance = player.getEffectValue(EffectType.Luck) + player.getEffectValue(EffectType.CritChance);
    let finalDamage = damage;
    let isCrit = false;
    if (critChance > 0 && Math.random() < critChance) {
      isCrit = true;
      finalDamage = Math.floor(damage * (CRIT_DAMAGE_MULTIPLIER + critChance));
    }
    const killed = enemy.takeDamage(finalDamage);
    this.ctx.scene.events.emit('show-damage', enemy.state.x, enemy.state.y - 15, finalDamage, isCrit ? '#ff2222' : '#ffffff', isCrit);

    // Lifesteal: heal player for % of damage dealt
    const lifesteal = player.getEffectValue(EffectType.Lifesteal);
    if (lifesteal > 0) {
      const heal = Math.floor(finalDamage * lifesteal);
      if (heal > 0) {
        player.state.hp = Math.min(player.state.maxHp, player.state.hp + heal);
      }
    }

    // Knockback: push enemy away from player
    const knockback = player.getEffectValue(EffectType.Knockback);
    if (knockback > 0 && enemy.state.alive) {
      const dx = enemy.state.x - player.state.x;
      const dy = enemy.state.y - player.state.y;
      const dist = Math.sqrt(dx * dx + dy * dy) || 1;
      enemy.state.x += (dx / dist) * knockback;
      enemy.state.y += (dy / dist) * knockback;
    }

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
