import type { WeaponInstance } from '../../../shared';
import type { Player } from '../../../entities/Player';
import { BaseForceFieldWeapon } from '../BaseForceFieldWeapon';

export class HolyShieldWeapon extends BaseForceFieldWeapon {
  protected renderForceField(weapon: WeaponInstance, doTick: boolean, _dt: number, player: Player): void {
    const stats = this.getStats(weapon);
    const area = stats.area * player.getAuraMultiplier();
    const dmgMul = player.getDamageMultiplier();
    const gfx = this.ctx.forceFieldGfx;

    const time = this.ctx.scene.time.now * 0.002 * stats.speed;
    for (let i = 0; i < stats.amount; i++) {
      const angle = time + (i / stats.amount) * Math.PI * 2;
      const ox = player.state.x + Math.cos(angle) * area;
      const oy = player.state.y + Math.sin(angle) * area;
      gfx.fillStyle(this.def.color, 0.7);
      gfx.fillCircle(ox, oy, 8);

      if (doTick) {
        const enemies = this.ctx.enemyPool.getEnemiesInRadius(ox, oy, 15);
        for (const enemy of enemies) {
          this.hitEnemy(enemy, Math.floor(stats.damage * dmgMul), this.def.type, player);
        }
      }
    }
  }
}
