import type { Enemy } from '../../../entities/Enemy';
import { BaseAoEWeapon } from '../BaseAoEWeapon';

/**
 * Plague Cloud — Poison DoT.
 * Enemies inside the cloud take tick damage AND receive a poison
 * that continues damaging them after they leave. Moderate slow.
 */
export class PlagueWeapon extends BaseAoEWeapon {
  protected override onTickHit(enemy: Enemy): void {
    enemy.applySlow(0.5, 500);
    // Apply lingering poison: DPS equal to the tick damage, lasts 3s after leaving
    enemy.applyPoison(8, 3000);
  }
}
