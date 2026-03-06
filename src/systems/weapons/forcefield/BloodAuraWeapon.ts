import type { Enemy } from '../../../entities/Enemy';
import { EnemyType } from '../../../types';
import { BaseForceFieldWeapon } from '../BaseForceFieldWeapon';
import { GameEvents } from '../../GameEvents';

export class BloodAuraWeapon extends BaseForceFieldWeapon {
  protected onTickHit(enemy: Enemy, stats: ReturnType<BloodAuraWeapon['getStats']>): void {
    // Death is immune to siphon-style healing
    if (enemy.state.type === EnemyType.Death) return;
    // Heal player for 20% of damage per enemy hit
    const heal = Math.floor(stats.damage * 0.2);
    if (heal > 0) {
      GameEvents.emit(this.ctx.scene.events, 'blood-aura-heal', heal);
    }
  }
}
