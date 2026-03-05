import type { Player } from '../../../entities/Player';
import { BaseProjectileWeapon } from '../BaseProjectileWeapon';

export class DeathRayWeapon extends BaseProjectileWeapon {
  protected computeAngle(_index: number, _total: number, player: Player): number {
    return this.angleToNearest(player);
  }
}
