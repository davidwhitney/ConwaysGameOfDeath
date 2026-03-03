import type { Player } from '../../../entities/Player';
import { BaseAoEWeapon } from '../BaseAoEWeapon';

export class QuakeWeapon extends BaseAoEWeapon {
  protected pickTarget(player: Player): { x: number; y: number } {
    // Always centered on the player
    return { x: player.state.x, y: player.state.y };
  }
}
