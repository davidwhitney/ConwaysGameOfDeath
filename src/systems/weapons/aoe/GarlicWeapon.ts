import { directionToInto } from '../../../utils/math';
import type { Enemy } from '../../../entities/Enemy';
import { BaseAoEWeapon, type ActiveAoE } from '../BaseAoEWeapon';

const _dir = { x: 0, y: 0 };

/**
 * Garlic — Repulsion burst.
 * Pushes enemies away from the AoE center every frame,
 * creating temporary safe zones. Light slow + damage on tick.
 */
export class GarlicWeapon extends BaseAoEWeapon {
  protected override onFrameHit(enemies: Enemy[], a: ActiveAoE, dt: number): void {
    const pushSpeed = 120;
    for (const enemy of enemies) {
      directionToInto(a.x, a.y, enemy.state.x, enemy.state.y, _dir);
      enemy.state.x += _dir.x * pushSpeed * dt;
      enemy.state.y += _dir.y * pushSpeed * dt;
    }
  }

  protected override onTickHit(enemy: Enemy): void {
    enemy.applySlow(0.7, 300);
  }
}
