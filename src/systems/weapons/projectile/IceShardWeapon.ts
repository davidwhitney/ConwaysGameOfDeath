import type { Player } from '../../../entities/Player';
import { BaseProjectileWeapon, type TrailConfig } from '../BaseProjectileWeapon';
import { Colors } from '../../../colors';

export class IceShardWeapon extends BaseProjectileWeapon {
  protected getTexture(): string {
    return 'proj-ice';
  }

  protected computeAngle(index: number, total: number, player: Player): number {
    const baseAngle = Math.atan2(player.facingY, player.facingX);
    return baseAngle + (index - (total - 1) / 2) * 0.3;
  }

  protected getTrailConfig(): TrailConfig {
    return {
      count: 4, spacing: 5, jitter: 3,
      layers: [
        { color: Colors.trails.ice[0], alpha: 0.3, radiusScale: 1.0, radiusTaper: 0.5 },
        { color: Colors.trails.ice[1], alpha: 0.4, radiusScale: 0.4, radiusTaper: 0.2 },
      ],
    };
  }
}
