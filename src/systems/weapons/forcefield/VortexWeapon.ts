import { directionTo } from '../../../utils/math';
import type { Player } from '../../../entities/Player';
import type { Enemy } from '../../../entities/Enemy';
import { BaseForceFieldWeapon } from '../BaseForceFieldWeapon';

export class VortexWeapon extends BaseForceFieldWeapon {
  protected onFrameHit(enemy: Enemy, _stats: ReturnType<VortexWeapon['getStats']>, dt: number, player: Player): void {
    const dir = directionTo(enemy.state, { x: player.state.x, y: player.state.y });
    const pullSpeed = 120;
    enemy.state.x += dir.x * pullSpeed * dt;
    enemy.state.y += dir.y * pullSpeed * dt;
  }
}
