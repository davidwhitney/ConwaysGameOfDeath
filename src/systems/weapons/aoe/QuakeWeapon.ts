import type { Player } from '../../../entities/Player';
import { BaseAoEWeapon } from '../BaseAoEWeapon';

export class QuakeWeapon extends BaseAoEWeapon {
  protected override fillAlphaScale = 0.1;
  protected override strokeAlphaScale = 0.3;

  protected pickTarget(player: Player): { x: number; y: number } {
    return { x: player.state.x, y: player.state.y };
  }
}
