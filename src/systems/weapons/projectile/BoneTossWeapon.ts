import type { Player } from '../../../entities/Player';
import { BaseProjectileWeapon } from '../BaseProjectileWeapon';

export class BoneTossWeapon extends BaseProjectileWeapon {
  protected computeAngle(_index: number, _total: number, _player: Player): number {
    // Random direction each bone
    return Math.random() * Math.PI * 2;
  }
}
