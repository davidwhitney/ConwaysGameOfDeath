import type { Player } from '../../../entities/Player';
import { BaseProjectileWeapon } from '../BaseProjectileWeapon';

export class MagicMissileWeapon extends BaseProjectileWeapon {
  protected getTexture(): string {
    return 'proj-magic';
  }

  protected computeAngle(_index: number, _total: number, player: Player): number {
    const nearest = this.findNearestEnemy(player.state.x, player.state.y);
    if (nearest) {
      return Math.atan2(nearest.state.y - player.state.y, nearest.state.x - player.state.x);
    }
    return Math.atan2(player.facingY, player.facingX);
  }
}
