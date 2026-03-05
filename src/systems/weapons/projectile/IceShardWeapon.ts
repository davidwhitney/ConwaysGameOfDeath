import type { Player } from '../../../entities/Player';
import { BaseProjectileWeapon, type ActiveProjectile } from '../BaseProjectileWeapon';

export class IceShardWeapon extends BaseProjectileWeapon {
  protected getTexture(): string {
    return 'proj-ice';
  }

  protected computeAngle(index: number, total: number, player: Player): number {
    const baseAngle = Math.atan2(player.facingY, player.facingX);
    return baseAngle + (index - (total - 1) / 2) * 0.3;
  }

  protected drawTrail(gfx: Phaser.GameObjects.Graphics, p: ActiveProjectile): void {
    const speed = Math.sqrt(p.vx * p.vx + p.vy * p.vy) || 1;
    const nx = -p.vx / speed;
    const ny = -p.vy / speed;
    // Icy crystalline trail — small fading shards
    for (let i = 1; i <= 4; i++) {
      const t = i / 4;
      const ox = p.x + nx * i * 5;
      const oy = p.y + ny * i * 5;
      const jx = (Math.random() - 0.5) * 3;
      const jy = (Math.random() - 0.5) * 3;
      // Cyan glow
      gfx.fillStyle(0x00ddff, (1 - t) * 0.3);
      gfx.fillCircle(ox + jx, oy + jy, p.radius * (1 - t * 0.5));
      // White sparkle
      gfx.fillStyle(0xffffff, (1 - t) * 0.4);
      gfx.fillCircle(ox + jx, oy + jy, p.radius * (0.4 - t * 0.2));
    }
  }
}
