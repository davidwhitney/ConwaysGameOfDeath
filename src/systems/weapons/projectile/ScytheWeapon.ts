import type { Player } from '../../../entities/Player';
import { BaseProjectileWeapon, type ActiveProjectile } from '../BaseProjectileWeapon';
import { Colors } from '../../../colors';

export class ScytheWeapon extends BaseProjectileWeapon {
  protected getTexture(): string {
    return 'proj-scythe';
  }

  protected computeAngle(index: number, total: number, _player: Player): number {
    return (index / total) * Math.PI * 2;
  }

  protected moveProjectile(proj: ActiveProjectile, dt: number, player: Player): boolean {
    proj.angle += dt * 4;
    proj.spiralDist += dt * 80;
    proj.x = player.state.x + Math.cos(proj.angle) * proj.spiralDist;
    proj.y = player.state.y + Math.sin(proj.angle) * proj.spiralDist;
    return true;
  }

  protected drawTrail(gfx: Phaser.GameObjects.Graphics, p: ActiveProjectile): void {
    // Ghostly sweeping arc behind scythe — angle-based, not velocity-based
    for (let i = 1; i <= 4; i++) {
      const t = i / 4;
      const a = p.angle - t * 0.5;
      const ox = p.x + Math.cos(a) * t * 6 - Math.cos(p.angle) * t * 6;
      const oy = p.y + Math.sin(a) * t * 6 - Math.sin(p.angle) * t * 6;
      gfx.fillStyle(Colors.trails.scythe, (1 - t) * 0.3);
      gfx.fillCircle(p.x + (ox - p.x), p.y + (oy - p.y), p.radius * (0.6 - t * 0.2));
    }
  }
}
