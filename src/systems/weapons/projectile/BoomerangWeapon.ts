import { directionTo } from '../../../utils/math';
import type { Player } from '../../../entities/Player';
import { BaseProjectileWeapon, type ActiveProjectile, type TrailConfig } from '../BaseProjectileWeapon';
import { Colors } from '../../../colors';

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

  protected getTrailConfig(): TrailConfig {
    return {
      count: 4, spacing: 5, jitter: 0,
      layers: [
        { color: Colors.trails.boomerang, alpha: 0.35, radiusScale: 0.7, radiusTaper: 0.3 },
      ],
    };
  }
}
