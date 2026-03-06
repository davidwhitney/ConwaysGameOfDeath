import type { WeaponDef, WeaponInstance } from '../../types';
import type { Player } from '../../entities/Player';
import { BaseEffectWeapon } from './BaseEffectWeapon';
import { drawEffectCircle } from './GfxPool';
import type { ActiveEffect } from './ActiveEffect';
import type { WeaponContext } from './WeaponContext';

interface ActiveMelee extends ActiveEffect {
  hitEnemies: Set<number>;
}

export class BaseMeleeWeapon extends BaseEffectWeapon<ActiveMelee> {
  constructor(ctx: WeaponContext, def: WeaponDef) {
    super(ctx, def, 9);
  }

  protected getCooldown(weapon: WeaponInstance, player: Player): number {
    return super.getCooldown(weapon, player) * (1 - player.getFuryReduction());
  }

  protected fire(weapon: WeaponInstance, player: Player): void {
    const stats = this.getStats(weapon);
    const dmgMul = player.getDamageMultiplier();

    for (let i = 0; i < stats.amount; i++) {
      if (!this.canAddEffect()) break;
      const angle = Math.atan2(player.facingY, player.facingX) + (i - (stats.amount - 1) / 2) * 0.5;

      this.effects.push({
        weaponType: this.def.type,
        x: player.state.x + Math.cos(angle) * stats.area * 0.6,
        y: player.state.y + Math.sin(angle) * stats.area * 0.6,
        radius: stats.area,
        damage: Math.floor(stats.damage * dmgMul),
        duration: stats.duration * player.getDurationMultiplier(),
        age: 0,
        hitEnemies: new Set(),
      });
    }
  }

  protected updateEffect(m: ActiveMelee, _dt: number, player: Player): void {
    const alpha = 1 - m.age / m.duration;
    drawEffectCircle(this.sharedGfx, m.x, m.y, m.radius * alpha, this.def.color, alpha * 0.4, alpha * 0.7);

    const enemies = this.ctx.enemyPool.getEnemiesInRadius(m.x, m.y, m.radius);
    for (const enemy of enemies) {
      if (m.hitEnemies.has(enemy.state.id)) continue;
      m.hitEnemies.add(enemy.state.id);
      this.hitEnemy(enemy, m.damage, this.def.type, player);
    }
  }
}
