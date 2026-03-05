import type { WeaponInstance } from '../../../types';
import type { Player } from '../../../entities/Player';
import { BaseForceFieldWeapon } from '../BaseForceFieldWeapon';
import { drawGlowCircle } from '../GfxPool';

export class HolyShieldWeapon extends BaseForceFieldWeapon {
  protected renderForceField(weapon: WeaponInstance, doTick: boolean, _dt: number, player: Player): void {
    const stats = this.getStats(weapon);
    const area = stats.area * player.getAuraMultiplier();
    const dmgMul = player.getDamageMultiplier();

    const time = this.ctx.scene.time.now * 0.002 * stats.speed;
    for (let i = 0; i < stats.amount; i++) {
      const angle = time + (i / stats.amount) * Math.PI * 2;
      const ox = player.state.x + Math.cos(angle) * area;
      const oy = player.state.y + Math.sin(angle) * area;
      drawGlowCircle(this.gfx, ox, oy, 8, this.def.color, 0.75, 1.75, 0.13);

      if (doTick) {
        const enemies = this.ctx.enemyPool.getEnemiesInRadius(ox, oy, 15);
        for (const enemy of enemies) {
          this.hitEnemy(enemy, Math.floor(stats.damage * dmgMul), this.def.type, player);
        }
      }
    }
  }
}
