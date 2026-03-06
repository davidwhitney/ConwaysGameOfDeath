import { directionToInto } from '../../../utils/math';
import type { Player } from '../../../entities/Player';
import type { Enemy } from '../../../entities/Enemy';
import { BaseForceFieldWeapon } from '../BaseForceFieldWeapon';

const _dir = { x: 0, y: 0 };

export class VortexWeapon extends BaseForceFieldWeapon {
  protected onFrameHit(enemy: Enemy, _stats: ReturnType<VortexWeapon['getStats']>, dt: number, player: Player): void {
    directionToInto(enemy.state.x, enemy.state.y, player.state.x, player.state.y, _dir);
    const pullSpeed = 120;
    enemy.state.x += _dir.x * pullSpeed * dt;
    enemy.state.y += _dir.y * pullSpeed * dt;
  }
}
