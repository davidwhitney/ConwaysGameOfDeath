import type { Player } from '../../../entities/Player';
import { BaseProjectileWeapon, type ActiveProjectile } from '../BaseProjectileWeapon';

export class DeathRayWeapon extends BaseProjectileWeapon {
  protected computeAngle(_index: number, _total: number, player: Player): number {
    return this.angleToNearest(player);
  }

  protected drawTrail(gfx: Phaser.GameObjects.Graphics, p: ActiveProjectile): void {
    const speed = Math.sqrt(p.vx * p.vx + p.vy * p.vy) || 1;
    const nx = -p.vx / speed;
    const ny = -p.vy / speed;
    // White-hot beam trail
    for (let i = 1; i <= 6; i++) {
      const t = i / 6;
      const ox = p.x + nx * i * 4;
      const oy = p.y + ny * i * 4;
      gfx.fillStyle(0xffffff, (1 - t) * 0.3);
      gfx.fillCircle(ox, oy, p.radius * (1 - t * 0.5));
    }
  }
}
