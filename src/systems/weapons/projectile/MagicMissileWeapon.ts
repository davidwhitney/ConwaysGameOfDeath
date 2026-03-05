import type { Player } from '../../../entities/Player';
import { BaseProjectileWeapon, type ActiveProjectile } from '../BaseProjectileWeapon';

export class MagicMissileWeapon extends BaseProjectileWeapon {
  protected getTexture(): string {
    return 'proj-magic';
  }

  protected computeAngle(_index: number, _total: number, player: Player): number {
    return this.angleToNearest(player);
  }

  protected drawTrail(gfx: Phaser.GameObjects.Graphics, p: ActiveProjectile): void {
    const speed = Math.sqrt(p.vx * p.vx + p.vy * p.vy) || 1;
    const nx = -p.vx / speed;
    const ny = -p.vy / speed;
    // Purple sparkle trail
    for (let i = 1; i <= 4; i++) {
      const t = i / 4;
      const ox = p.x + nx * i * 5;
      const oy = p.y + ny * i * 5;
      const jx = (Math.random() - 0.5) * 5;
      const jy = (Math.random() - 0.5) * 5;
      // Purple glow
      gfx.fillStyle(0xcc44ff, (1 - t) * 0.4);
      gfx.fillCircle(ox + jx, oy + jy, p.radius * (0.8 - t * 0.4));
      // White sparkle
      gfx.fillStyle(0xffffff, (1 - t) * 0.3);
      gfx.fillCircle(ox + jx, oy + jy, p.radius * (0.2));
    }
  }
}
