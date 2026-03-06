import { directionToInto } from '../../../utils/math';
import type { Player } from '../../../entities/Player';
import type { Enemy } from '../../../entities/Enemy';
import { BaseForceFieldWeapon } from '../BaseForceFieldWeapon';

const _dir = { x: 0, y: 0 };

export class GravityWellWeapon extends BaseForceFieldWeapon {
  protected onFrameHit(enemy: Enemy, _stats: ReturnType<GravityWellWeapon['getStats']>, dt: number, player: Player): void {
    // Pull enemies towards player
    directionToInto(enemy.state.x, enemy.state.y, player.state.x, player.state.y, _dir);
    const pullSpeed = 90;
    enemy.state.x += _dir.x * pullSpeed * dt;
    enemy.state.y += _dir.y * pullSpeed * dt;
  }

  protected onTickHit(enemy: Enemy): void {
    // Also slow enemies caught in the well
    enemy.applySlow(0.5, 400);
  }
}
