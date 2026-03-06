import type { WeaponInstance } from '../../../types';
import type { Player } from '../../../entities/Player';
import { BaseForceFieldWeapon } from '../BaseForceFieldWeapon';
import { drawGlowCircle } from '../GfxPool';
import { distanceSq } from '../../../utils/math';

const ORB_HIT_RADIUS = 15;
const ORB_HIT_RADIUS_SQ = ORB_HIT_RADIUS * ORB_HIT_RADIUS;

export class HolyShieldWeapon extends BaseForceFieldWeapon {
  protected renderForceField(weapon: WeaponInstance, doTick: boolean, _dt: number, player: Player): void {
    const stats = this.getStats(weapon);
    const area = stats.area * player.getAuraMultiplier();
    const dmgMul = player.getDamageMultiplier();

    const time = this.ctx.scene.time.now * 0.002 * stats.speed;

    // Compute all orb positions first
    const orbPositions: { x: number; y: number }[] = [];
    for (let i = 0; i < stats.amount; i++) {
      const angle = time + (i / stats.amount) * Math.PI * 2;
      orbPositions.push({
        x: player.state.x + Math.cos(angle) * area,
        y: player.state.y + Math.sin(angle) * area,
      });
      drawGlowCircle(this.gfx, orbPositions[i].x, orbPositions[i].y, 8, this.def.color, 0.75, 1.75, 0.13);
    }

    if (doTick) {
      // Single broad query covering all orbs, then filter per-orb
      const enemies = this.ctx.enemyPool.getEnemiesInRadius(player.state.x, player.state.y, area + ORB_HIT_RADIUS);
      const damage = Math.floor(stats.damage * dmgMul);
      for (const enemy of enemies) {
        for (const orb of orbPositions) {
          const dx = enemy.state.x - orb.x;
          const dy = enemy.state.y - orb.y;
          if (dx * dx + dy * dy < ORB_HIT_RADIUS_SQ) {
            this.hitEnemy(enemy, damage, this.def.type, player);
            break; // only hit once per tick even if near multiple orbs
          }
        }
      }
    }
  }
}
