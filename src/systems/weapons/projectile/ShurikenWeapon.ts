import type { Player } from '../../../entities/Player';
import { BaseProjectileWeapon } from '../BaseProjectileWeapon';

export class ShurikenWeapon extends BaseProjectileWeapon {
  protected computeAngle(index: number, total: number, _player: Player): number {
    // Spread evenly around 360 degrees
    return (index / total) * Math.PI * 2;
  }
}
