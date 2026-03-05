import type { Player } from '../../../entities/Player';
import { BaseProjectileWeapon, type TrailConfig } from '../BaseProjectileWeapon';
import { Colors } from '../../../colors';

export class DeathRayWeapon extends BaseProjectileWeapon {
  protected computeAngle(_index: number, _total: number, player: Player): number {
    return this.angleToNearest(player);
  }

  protected getTrailConfig(): TrailConfig {
    return {
      count: 6, spacing: 4, jitter: 0,
      layers: [
        { color: Colors.trails.deathRay, alpha: 0.3, radiusScale: 1.0, radiusTaper: 0.5 },
      ],
    };
  }
}
