import type { WeaponInstance } from '../../types';
import { WEAPON_TICK_INTERVAL_MS } from '../../constants';
import type { Player } from '../../entities/Player';
import { BaseWeapon } from './BaseWeapon';
import { drawEffectCircle } from './GfxPool';
import type { Enemy } from '../../entities/Enemy';

export class BaseForceFieldWeapon extends BaseWeapon {
  protected gfx: Phaser.GameObjects.Graphics;
  private tickTimer = 0;

  constructor(...args: ConstructorParameters<typeof BaseWeapon>) {
    super(...args);
    this.gfx = this.ctx.scene.add.graphics();
    this.gfx.setDepth(8);
  }

  protected dealsDamage(): boolean {
    return true;
  }

  protected onTickHit(_enemy: Enemy, _stats: ReturnType<BaseForceFieldWeapon['getStats']>): void {
    // Override in subclasses
  }

  protected onFrameHit(_enemy: Enemy, _stats: ReturnType<BaseForceFieldWeapon['getStats']>, _dt: number, _player: Player): void {
    // Override in subclasses
  }

  update(dt: number, player: Player, weapon: WeaponInstance): void {
    this.gfx.clear();
    this.tickTimer += dt * 1000;
    let doTick = false;
    if (this.tickTimer >= WEAPON_TICK_INTERVAL_MS) {
      this.tickTimer -= WEAPON_TICK_INTERVAL_MS;
      doTick = true;
    }
    this.renderForceField(weapon, doTick, dt, player);
  }

  protected renderForceField(weapon: WeaponInstance, doTick: boolean, dt: number, player: Player): void {
    const stats = this.getStats(weapon);
    const area = stats.area * player.auraMultiplier;
    const dmgMul = player.damageMultiplier;

    drawEffectCircle(this.gfx, player.state.x, player.state.y, area, this.def.color, 0.2, 0.5, 2);

    const enemies = this.ctx.enemyPool.getEnemiesInRadius(player.state.x, player.state.y, area);

    for (const enemy of enemies) {
      this.onFrameHit(enemy, stats, dt, player);
    }

    if (doTick) {
      for (const enemy of enemies) {
        if (this.dealsDamage()) {
          this.hitEnemy(enemy, Math.floor(stats.damage * dmgMul), this.def.type, player);
        }
        this.onTickHit(enemy, stats);
      }
    }
  }

  destroy(): void {
    this.gfx.destroy();
  }
}
