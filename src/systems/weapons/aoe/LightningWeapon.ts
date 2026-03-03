import type { Player } from '../../../entities/Player';
import { BaseAoEWeapon } from '../BaseAoEWeapon';

export class LightningWeapon extends BaseAoEWeapon {
  protected pickTarget(player: Player): { x: number; y: number } {
    const nearest = this.ctx.findNearestEnemy(player.state.x, player.state.y);
    if (nearest) {
      return { x: nearest.state.x, y: nearest.state.y };
    }
    return super.pickTarget(player);
  }
}
