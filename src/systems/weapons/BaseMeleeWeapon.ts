import type { WeaponInstance } from '../../shared';
import type { Player } from '../../entities/Player';
import { BaseWeapon } from './BaseWeapon';
import { GfxPool } from './GfxPool';

interface ActiveMelee {
  weaponType: number;
  x: number;
  y: number;
  radius: number;
  damage: number;
  duration: number;
  age: number;
  hitEnemies: Set<number>;
  gfx: Phaser.GameObjects.Graphics;
}

export class BaseMeleeWeapon extends BaseWeapon {
  protected melees: ActiveMelee[] = [];
  private pool: GfxPool;

  constructor(ctx: import('./WeaponContext').WeaponContext, def: import('../../shared').WeaponDef) {
    super(ctx, def);
    this.pool = new GfxPool(ctx.scene, 9);
  }

  protected getCooldown(weapon: WeaponInstance, player: Player): number {
    return super.getCooldown(weapon, player) * (1 - player.getFuryReduction());
  }

  protected fire(weapon: WeaponInstance, player: Player): void {
    const stats = this.getStats(weapon);
    const dmgMul = player.getDamageMultiplier();

    for (let i = 0; i < stats.amount; i++) {
      const angle = Math.atan2(player.facingY, player.facingX) + (i - (stats.amount - 1) / 2) * 0.5;

      this.melees.push({
        weaponType: this.def.type,
        x: player.state.x + Math.cos(angle) * stats.area * 0.6,
        y: player.state.y + Math.sin(angle) * stats.area * 0.6,
        radius: stats.area,
        damage: Math.floor(stats.damage * dmgMul),
        duration: stats.duration * player.getDurationMultiplier(),
        age: 0,
        hitEnemies: new Set(),
        gfx: this.pool.acquire(),
      });
    }
  }

  protected updateActive(dt: number, player: Player): void {
    for (let i = this.melees.length - 1; i >= 0; i--) {
      const m = this.melees[i];
      m.age += dt * 1000;

      if (m.age >= m.duration) {
        this.pool.release(m.gfx);
        this.melees.splice(i, 1);
        continue;
      }

      const alpha = 1 - m.age / m.duration;
      m.gfx.clear();
      m.gfx.fillStyle(this.def.color, alpha * 0.4);
      m.gfx.fillCircle(m.x, m.y, m.radius * alpha);
      m.gfx.lineStyle(2, this.def.color, alpha * 0.8);
      m.gfx.strokeCircle(m.x, m.y, m.radius * alpha);

      const enemies = this.ctx.enemyPool.getEnemiesInRadius(m.x, m.y, m.radius);
      for (const enemy of enemies) {
        if (m.hitEnemies.has(enemy.state.id)) continue;
        m.hitEnemies.add(enemy.state.id);
        this.hitEnemy(enemy, m.damage, this.def.type, player);
      }
    }
  }

  destroy(): void {
    for (const m of this.melees) m.gfx.destroy();
    this.melees.length = 0;
    this.pool.destroy();
  }
}
