import type { Enemy } from '../../../entities/Enemy';
import { BaseForceFieldWeapon } from '../BaseForceFieldWeapon';

export class BloodAuraWeapon extends BaseForceFieldWeapon {
  protected onTickHit(_enemy: Enemy, stats: ReturnType<BloodAuraWeapon['getStats']>): void {
    // Heal player for 20% of damage per enemy hit
    const heal = Math.floor(stats.damage * 0.2);
    if (heal > 0) {
      this.ctx.scene.events.emit('blood-aura-heal', heal);
    }
  }
}
