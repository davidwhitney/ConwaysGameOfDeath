import type { WeaponInstance } from '../../../types';
import type { Player } from '../../../entities/Player';
import { BaseForceFieldWeapon } from '../BaseForceFieldWeapon';

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
      // Outer glow
      this.gfx.fillStyle(this.def.color, 0.1);
      this.gfx.fillCircle(ox, oy, 14);
      // Core orb — translucent
      this.gfx.fillStyle(this.def.color, 0.75);
      this.gfx.fillCircle(ox, oy, 8);
      // Hot center
      this.gfx.fillStyle(0xffffff, 0.3);
      this.gfx.fillCircle(ox, oy, 4);

      if (doTick) {
        const enemies = this.ctx.enemyPool.getEnemiesInRadius(ox, oy, 15);
        for (const enemy of enemies) {
          this.hitEnemy(enemy, Math.floor(stats.damage * dmgMul), this.def.type, player);
        }
      }
    }
  }
}
