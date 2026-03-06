import { directionToInto } from '../../../utils/math';
import type { Player } from '../../../entities/Player';
import { WEAPON_TICK_INTERVAL_MS } from '../../../constants';
import { BaseAoEWeapon, type ActiveAoE } from '../BaseAoEWeapon';
import { drawEffectCircle } from '../GfxPool';

const _dir = { x: 0, y: 0 };

/**
 * Garlic — Repulsion burst.
 * Pushes enemies away from the AoE center every frame,
 * creating temporary safe zones. Light slow + damage on tick.
 */
export class GarlicWeapon extends BaseAoEWeapon {
  protected override updateEffect(a: ActiveAoE, dt: number, player: Player): void {
    const progress = a.age / a.duration;
    const alpha = progress < 0.1 ? progress * 10 : (progress > 0.8 ? (1 - progress) * 5 : 1);
    drawEffectCircle(this.sharedGfx, a.x, a.y, a.radius, this.def.color, alpha * 0.35, alpha * 0.6);

    // Push enemies outward from AoE center every frame
    const enemies = this.ctx.enemyPool.getEnemiesInRadius(a.x, a.y, a.radius);
    const pushSpeed = 120;
    for (const enemy of enemies) {
      directionToInto(a.x, a.y, enemy.state.x, enemy.state.y, _dir);
      enemy.state.x += _dir.x * pushSpeed * dt;
      enemy.state.y += _dir.y * pushSpeed * dt;
    }

    // Tick damage + light slow
    a.tickTimer += dt * 1000;
    if (a.tickTimer >= WEAPON_TICK_INTERVAL_MS) {
      a.tickTimer -= WEAPON_TICK_INTERVAL_MS;
      for (const enemy of enemies) {
        this.hitEnemy(enemy, a.damage, this.def.type, player);
        enemy.applySlow(0.7, 300);
      }
    }
  }
}
