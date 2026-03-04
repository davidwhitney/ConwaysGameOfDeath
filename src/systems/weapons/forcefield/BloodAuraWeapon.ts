import type { Enemy } from '../../../entities/Enemy';
import { BaseForceFieldWeapon } from '../BaseForceFieldWeapon';
import { GameEvents } from '../../GameEvents';

export class BloodAuraWeapon extends BaseForceFieldWeapon {
  protected onTickHit(_enemy: Enemy, stats: ReturnType<BloodAuraWeapon['getStats']>): void {
    // Heal player for 20% of damage per enemy hit
    const heal = Math.floor(stats.damage * 0.2);
    if (heal > 0) {
      GameEvents.emit(this.ctx.scene.events, 'blood-aura-heal', heal);
    }
  }
}
