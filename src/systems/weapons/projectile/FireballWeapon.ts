import { BaseProjectileWeapon, type TrailConfig } from '../BaseProjectileWeapon';
import { Colors } from '../../../colors';

export class FireballWeapon extends BaseProjectileWeapon {
  protected getTexture(): string {
    return 'proj-fire';
  }

  protected getTrailConfig(): TrailConfig {
    return {
      count: 5, spacing: 6, jitter: 4,
      layers: [
        { color: Colors.trails.fire[0], alpha: 0.4, radiusScale: 1.5, radiusTaper: 0.9 },
        { color: Colors.trails.fire[1], alpha: 0.6, radiusScale: 1.0, radiusTaper: 0.6 },
      ],
    };
  }
}
