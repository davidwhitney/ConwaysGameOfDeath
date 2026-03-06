import type { Enemy } from '../../../entities/Enemy';
import { EnemyType } from '../../../types';
import { BaseForceFieldWeapon } from '../BaseForceFieldWeapon';
import { GameEvents } from '../../GameEvents';

export class BloodAuraWeapon extends BaseForceFieldWeapon {
  protected onTickHit(enemy: Enemy, stats: ReturnType<BloodAuraWeapon['getStats']>): void {
    // 10% effectiveness vs Death
    const deathPenalty = enemy.state.type === EnemyType.Death ? 0.1 : 1;
    const heal = Math.floor(stats.damage * 0.2 * deathPenalty);
    if (heal > 0) {
      GameEvents.emit(this.ctx.scene.events, 'blood-aura-heal', heal);
    }
  }
}
