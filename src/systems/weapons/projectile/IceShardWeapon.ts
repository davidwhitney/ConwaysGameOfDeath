import type { Player } from '../../../entities/Player';
import { BaseProjectileWeapon } from '../BaseProjectileWeapon';

export class IceShardWeapon extends BaseProjectileWeapon {
  protected getTexture(): string {
    return 'proj-ice';
  }

  protected computeAngle(index: number, total: number, player: Player): number {
    const baseAngle = Math.atan2(player.facingY, player.facingX);
    return baseAngle + (index - (total - 1) / 2) * 0.3;
  }
}
