import type { Enemy } from '../../../entities/Enemy';
import { BaseForceFieldWeapon } from '../BaseForceFieldWeapon';

export class FrostAuraWeapon extends BaseForceFieldWeapon {
  protected onTickHit(enemy: Enemy): void {
    enemy.applySlow(0.5, 500);
  }
}
