import { directionTo } from '../../../utils/math';
import type { Player } from '../../../entities/Player';
import { BaseProjectileWeapon, type ActiveProjectile } from '../BaseProjectileWeapon';

export class BoomerangWeapon extends BaseProjectileWeapon {
  protected getTexture(): string {
    return 'proj-boomerang';
  }

  protected moveProjectile(proj: ActiveProjectile, dt: number, player: Player): boolean {
    if (proj.age > proj.lifetime * 0.5 && !proj.returning) {
      proj.returning = true;
    }

    if (proj.returning) {
      const dir = directionTo(proj, { x: player.state.x, y: player.state.y });
      const speed = 350;
      proj.vx = dir.x * speed;
      proj.vy = dir.y * speed;

      const dx = proj.x - player.state.x;
      const dy = proj.y - player.state.y;
      if (dx * dx + dy * dy < 400) {
        return false; // despawn
      }
    }

    proj.x += proj.vx * dt;
    proj.y += proj.vy * dt;
    return true;
  }

  protected drawTrail(gfx: Phaser.GameObjects.Graphics, p: ActiveProjectile): void {
    const speed = Math.sqrt(p.vx * p.vx + p.vy * p.vy) || 1;
    const nx = -p.vx / speed;
    const ny = -p.vy / speed;
    // Golden arc trail
    for (let i = 1; i <= 4; i++) {
      const t = i / 4;
      const ox = p.x + nx * i * 5;
      const oy = p.y + ny * i * 5;
      gfx.fillStyle(0xffcc00, (1 - t) * 0.35);
      gfx.fillCircle(ox, oy, p.radius * (0.7 - t * 0.3));
    }
  }
}
