import type { WeaponInstance } from '../../shared';
import type { Player } from '../../entities/Player';
import { BaseWeapon } from './BaseWeapon';
import type { Enemy } from '../../entities/Enemy';

export class BaseForceFieldWeapon extends BaseWeapon {
  protected dealsDamage(): boolean {
    return true;
  }

  protected onTickHit(_enemy: Enemy, _stats: ReturnType<BaseForceFieldWeapon['getStats']>): void {
    // Override in subclasses
  }

  protected onFrameHit(_enemy: Enemy, _stats: ReturnType<BaseForceFieldWeapon['getStats']>, _dt: number, _player: Player): void {
    // Override in subclasses
  }

  update(_dt: number, player: Player, weapon: WeaponInstance): void {
    this.renderForceField(weapon, this.ctx.forceFieldDoTick, _dt, player);
  }

  protected renderForceField(weapon: WeaponInstance, doTick: boolean, dt: number, player: Player): void {
    const stats = this.getStats(weapon);
    const area = stats.area * player.getAuraMultiplier();
    const dmgMul = player.getDamageMultiplier();
    const gfx = this.ctx.forceFieldGfx;

    gfx.fillStyle(this.def.color, 0.1);
    gfx.fillCircle(player.state.x, player.state.y, area);
    gfx.lineStyle(1, this.def.color, 0.3);
    gfx.strokeCircle(player.state.x, player.state.y, area);

    const enemies = this.ctx.enemyPool.getEnemiesInRadius(player.state.x, player.state.y, area);

    for (const enemy of enemies) {
      this.onFrameHit(enemy, stats, dt, player);
    }

    if (doTick) {
      for (const enemy of enemies) {
        if (this.dealsDamage()) {
          this.ctx.hitEnemy(enemy, Math.floor(stats.damage * dmgMul), this.def.type);
        }
        this.onTickHit(enemy, stats);
      }
    }
  }

  destroy(): void {
    // No internal state to clean up
  }
}
