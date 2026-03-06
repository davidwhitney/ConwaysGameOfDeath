import { type WeaponDef, type WeaponInstance, type WeaponType, EffectType, EnemyType } from '../../types';
import { CRIT_DAMAGE_MULTIPLIER, DEATH_KNOCKBACK_MULT } from '../../constants';
import { distanceSq, directionToInto } from '../../utils/math';
import type { Player } from '../../entities/Player';
import type { Enemy } from '../../entities/Enemy';
import type { WeaponContext } from './WeaponContext';
import { GameEvents } from '../GameEvents';

export abstract class BaseWeapon {
  protected ctx: WeaponContext;
  protected def: WeaponDef;
  protected appliesKnockback = true;
  /** Reusable direction vector for knockback */
  private readonly _kbDir = { x: 0, y: 0 };

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
    const killed = enemy.takeDamage(finalDamage, player.state.x, player.state.y);
    GameEvents.emit(this.ctx.scene.events, 'show-damage', enemy.state.x, enemy.state.y - 15, finalDamage, isCrit ? '#ff2222' : '#ffffff', isCrit);
    GameEvents.sfx('enemy-hit');

    // Lifesteal: heal player for % of damage dealt (Death is immune — no siphoning)
    if (enemy.state.type !== EnemyType.Death) {
      const lifesteal = player.getEffectValue(EffectType.Lifesteal);
      if (lifesteal > 0) {
        const heal = Math.floor(finalDamage * lifesteal);
        if (heal > 0) {
          player.state.hp = Math.min(player.state.maxHp, player.state.hp + heal);
        }
      }
    }

    // Knockback: push enemy away from player (Death is pulled toward player)
    // Skipped for AoE weapons and during knockback immunity
    const knockback = player.getEffectValue(EffectType.Knockback);
    const now = this.ctx.scene.time.now;
    if (this.appliesKnockback && knockback > 0 && enemy.state.alive && now >= enemy.knockbackImmuneUntil) {
      directionToInto(player.state.x, player.state.y, enemy.state.x, enemy.state.y, this._kbDir);
      const mult = enemy.state.type === EnemyType.Death ? DEATH_KNOCKBACK_MULT : 1;
      enemy.state.x += this._kbDir.x * knockback * mult;
      enemy.state.y += this._kbDir.y * knockback * mult;
      enemy.knockbackImmuneUntil = now + 500;
    }

    if (killed) {
      GameEvents.sfx('enemy-kill');
      GameEvents.emit(this.ctx.scene.events, 'enemy-killed', enemy, weaponType);
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
      GameEvents.sfx('weapon-fire');
    }
    this.updateActive(dt, player);
  }

  protected fire(_weapon: WeaponInstance, _player: Player): void {}
  protected updateActive(_dt: number, _player: Player): void {}
  abstract destroy(): void;
}
