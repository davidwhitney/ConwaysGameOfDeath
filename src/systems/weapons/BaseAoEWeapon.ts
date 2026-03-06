import type { WeaponDef, WeaponInstance } from '../../types';
import { WEAPON_TICK_INTERVAL_MS } from '../../constants';
import type { Player } from '../../entities/Player';
import { BaseEffectWeapon } from './BaseEffectWeapon';
import { drawEffectCircle } from './GfxPool';
import type { Enemy } from '../../entities/Enemy';
import type { ActiveEffect } from './ActiveEffect';
import type { WeaponContext } from './WeaponContext';

export interface ActiveAoE extends ActiveEffect {
  tickTimer: number;
}

export class BaseAoEWeapon extends BaseEffectWeapon<ActiveAoE> {
  protected override appliesKnockback = false;
  protected fillAlphaScale = 0.35;
  protected strokeAlphaScale = 0.6;

  constructor(ctx: WeaponContext, def: WeaponDef) {
    super(ctx, def, 6);
  }

  protected pickTarget(player: Player): { x: number; y: number } {
    const angle = Math.random() * Math.PI * 2;
    const dist = 50 + Math.random() * 150;
    return {
      x: player.state.x + Math.cos(angle) * dist,
      y: player.state.y + Math.sin(angle) * dist,
    };
  }

  protected onTickHit(_enemy: Enemy): void {
    // Override in subclasses for per-weapon effects
  }

  protected onFrameHit(_enemies: Enemy[], _a: ActiveAoE, _dt: number): void {
    // Override for per-frame effects (e.g. push)
  }

  protected fire(weapon: WeaponInstance, player: Player): void {
    const stats = this.getStats(weapon);
    const dmgMul = player.damageMultiplier;
    const auraMul = player.auraMultiplier;

    for (let i = 0; i < stats.amount; i++) {
      if (!this.canAddEffect()) break;
      const target = this.pickTarget(player);

      this.effects.push({
        weaponType: this.def.type,
        x: target.x,
        y: target.y,
        radius: stats.area * auraMul,
        damage: Math.floor(stats.damage * dmgMul),
        duration: Math.max(stats.duration * player.durationMultiplier, 300),
        age: 0,
        tickTimer: 0,
      });
    }
  }

  protected updateEffect(a: ActiveAoE, dt: number, player: Player): void {
    const progress = a.age / a.duration;
    const alpha = progress < 0.1 ? progress * 10 : (progress > 0.8 ? (1 - progress) * 5 : 1);
    drawEffectCircle(this.sharedGfx, a.x, a.y, a.radius, this.def.color, alpha * this.fillAlphaScale, alpha * this.strokeAlphaScale);

    const enemies = this.ctx.enemyPool.getEnemiesInRadius(a.x, a.y, a.radius);
    this.onFrameHit(enemies, a, dt);

    a.tickTimer += dt * 1000;
    if (a.tickTimer >= WEAPON_TICK_INTERVAL_MS) {
      a.tickTimer -= WEAPON_TICK_INTERVAL_MS;
      for (const enemy of enemies) {
        this.hitEnemy(enemy, a.damage, this.def.type, player);
        this.onTickHit(enemy);
      }
    }
  }
}
