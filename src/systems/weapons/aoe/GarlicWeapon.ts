import type { Enemy } from '../../../entities/Enemy';
import { BaseAoEWeapon } from '../BaseAoEWeapon';

export class GarlicWeapon extends BaseAoEWeapon {
  protected onTickHit(enemy: Enemy): void {
    enemy.applySlow(0.6, 400);
  }
}
