import { directionToInto } from '../../../utils/math';
import type { Player } from '../../../entities/Player';
import { BaseProjectileWeapon, type ActiveProjectile, type TrailConfig } from '../BaseProjectileWeapon';
import { Colors } from '../../../colors';

const _dir = { x: 0, y: 0 };

export class BoomerangWeapon extends BaseProjectileWeapon {
  protected getTexture(): string {
    return 'proj-boomerang';
  }

  protected moveProjectile(proj: ActiveProjectile, dt: number, player: Player): boolean {
    if (proj.age > proj.lifetime * 0.5 && !proj.returning) {
      proj.returning = true;
    }

    if (proj.returning) {
      directionToInto(proj.x, proj.y, player.state.x, player.state.y, _dir);
      const speed = 350;
      proj.vx = _dir.x * speed;
      proj.vy = _dir.y * speed;

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
