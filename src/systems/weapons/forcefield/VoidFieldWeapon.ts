import type { Enemy } from '../../../entities/Enemy';
import { BaseForceFieldWeapon } from '../BaseForceFieldWeapon';

export class VoidFieldWeapon extends BaseForceFieldWeapon {
  protected dealsDamage(): boolean {
    return false;
  }

  protected onTickHit(enemy: Enemy): void {
    enemy.applySlow(0.4, 300);
  }
}
