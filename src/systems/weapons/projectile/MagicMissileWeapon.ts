import type { Player } from '../../../entities/Player';
import { BaseProjectileWeapon, type TrailConfig } from '../BaseProjectileWeapon';
import { Colors } from '../../../colors';

export class MagicMissileWeapon extends BaseProjectileWeapon {
  protected getTexture(): string {
    return 'proj-magic';
  }

  protected computeAngle(_index: number, _total: number, player: Player): number {
    return this.angleToNearest(player);
  }

  protected getTrailConfig(): TrailConfig {
    return {
      count: 4, spacing: 5, jitter: 5,
      layers: [
        { color: Colors.trails.magic[0], alpha: 0.4, radiusScale: 0.8, radiusTaper: 0.4 },
        { color: Colors.trails.magic[1], alpha: 0.3, radiusScale: 0.2 },
      ],
    };
  }
}
