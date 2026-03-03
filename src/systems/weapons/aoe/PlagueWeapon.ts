import type { Enemy } from '../../../entities/Enemy';
import { BaseAoEWeapon } from '../BaseAoEWeapon';

export class PlagueWeapon extends BaseAoEWeapon {
  protected onTickHit(enemy: Enemy): void {
    enemy.applySlow(0.5, 500);
  }
}
