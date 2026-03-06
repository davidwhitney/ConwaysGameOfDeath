import { directionToInto, distSqXY } from '../../../utils/math';
import type { Player } from '../../../entities/Player';
import type { Enemy } from '../../../entities/Enemy';
import { BaseForceFieldWeapon } from '../BaseForceFieldWeapon';
import type { WeaponInstance } from '../../../types';

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
    enemy.applySlow(0.5, 400);
  }

  override update(dt: number, player: Player, weapon: WeaponInstance): void {
    super.update(dt, player, weapon);
    this.pullGems(dt, player, weapon);
  }

  private pullGems(dt: number, player: Player, weapon: WeaponInstance): void {
    const stats = this.getStats(weapon);
    const area = stats.area * player.getAuraMultiplier();
    const areaSq = area * area;
    const pullSpeed = 200;
    const gems = this.ctx.getActiveGems();

    for (const gem of gems) {
      if (!gem.alive) continue;
      const dSq = distSqXY(player.state.x, player.state.y, gem.x, gem.y);
      if (dSq > areaSq || dSq === 0) continue;
      const len = Math.sqrt(dSq);
      gem.x += ((player.state.x - gem.x) / len) * pullSpeed * dt;
      gem.y += ((player.state.y - gem.y) / len) * pullSpeed * dt;
      gem.sprite.setPosition(gem.x, gem.y);
      gem.magnetized = true;
    }
  }
}
