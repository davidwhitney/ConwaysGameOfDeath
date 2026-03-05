import type { Player } from '../../../entities/Player';
import { BaseProjectileWeapon } from '../BaseProjectileWeapon';

export class MagicMissileWeapon extends BaseProjectileWeapon {
  protected getTexture(): string {
    return 'proj-magic';
  }

  protected computeAngle(_index: number, _total: number, player: Player): number {
    return this.angleToNearest(player);
  }
}
