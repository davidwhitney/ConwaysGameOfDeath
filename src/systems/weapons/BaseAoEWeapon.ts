import type { WeaponDef, WeaponInstance } from '../../types';
import { WEAPON_TICK_INTERVAL_MS } from '../../constants';
import type { Player } from '../../entities/Player';
import { BaseEffectWeapon } from './BaseEffectWeapon';
import { drawEffectCircle } from './GfxPool';
import type { Enemy } from '../../entities/Enemy';
import type { ActiveEffect } from './ActiveEffect';
import type { WeaponContext } from './WeaponContext';

interface ActiveAoE extends ActiveEffect {
  tickTimer: number;
}

export class BaseAoEWeapon extends BaseEffectWeapon<ActiveAoE> {
  protected override appliesKnockback = false;

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

  protected fire(weapon: WeaponInstance, player: Player): void {
    const stats = this.getStats(weapon);
    const dmgMul = player.getDamageMultiplier();
    const auraMul = player.getAuraMultiplier();

    for (let i = 0; i < stats.amount; i++) {
      const target = this.pickTarget(player);

      this.effects.push({
        weaponType: this.def.type,
        x: target.x,
        y: target.y,
        radius: stats.area * auraMul,
        damage: Math.floor(stats.damage * dmgMul),
        duration: Math.max(stats.duration * player.getDurationMultiplier(), 300),
        age: 0,
        tickTimer: 0,
        gfx: this.pool.acquire(),
      });
    }
  }

  protected updateEffect(a: ActiveAoE, dt: number, player: Player): void {
    const progress = a.age / a.duration;
    const alpha = progress < 0.1 ? progress * 10 : (progress > 0.8 ? (1 - progress) * 5 : 1);
    a.gfx.clear();
    drawEffectCircle(a.gfx, a.x, a.y, a.radius, this.def.color, alpha * 0.35, alpha * 0.6);

    a.tickTimer += dt * 1000;
    if (a.tickTimer >= WEAPON_TICK_INTERVAL_MS) {
      a.tickTimer -= WEAPON_TICK_INTERVAL_MS;
      const enemies = this.ctx.enemyPool.getEnemiesInRadius(a.x, a.y, a.radius);
      for (const enemy of enemies) {
        this.hitEnemy(enemy, a.damage, this.def.type, player);
        this.onTickHit(enemy);
      }
    }
  }
}
