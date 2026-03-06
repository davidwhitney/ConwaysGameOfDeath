import type { Enemy } from '../../../entities/Enemy';
import { EnemyType } from '../../../types';
import { DEATH_EFFECTIVENESS_MULT } from '../../../constants';
import { BaseForceFieldWeapon } from '../BaseForceFieldWeapon';
import { GameEvents } from '../../GameEvents';

export class BloodAuraWeapon extends BaseForceFieldWeapon {
  protected onTickHit(enemy: Enemy, stats: ReturnType<BloodAuraWeapon['getStats']>): void {
    const deathPenalty = enemy.state.type === EnemyType.Death ? DEATH_EFFECTIVENESS_MULT : 1;
    const heal = Math.floor(stats.damage * 0.2 * deathPenalty);
    if (heal > 0) {
      GameEvents.emit(this.ctx.scene.events, 'blood-aura-heal', heal);
    }
  }
}
