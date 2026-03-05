import { directionTo } from '../../../utils/math';
import type { Player } from '../../../entities/Player';
import type { Enemy } from '../../../entities/Enemy';
import { BaseForceFieldWeapon } from '../BaseForceFieldWeapon';

export class GravityWellWeapon extends BaseForceFieldWeapon {
  protected onFrameHit(enemy: Enemy, _stats: ReturnType<GravityWellWeapon['getStats']>, dt: number, player: Player): void {
    // Pull enemies towards player
    const dir = directionTo(enemy.state, { x: player.state.x, y: player.state.y });
    const pullSpeed = 90;
    enemy.state.x += dir.x * pullSpeed * dt;
    enemy.state.y += dir.y * pullSpeed * dt;
  }

  protected onTickHit(enemy: Enemy): void {
    // Also slow enemies caught in the well
    enemy.applySlow(0.5, 400);
  }
}
