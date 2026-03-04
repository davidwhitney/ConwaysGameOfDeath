import type { WeaponInstance } from '../../shared';
import type { Player } from '../../entities/Player';
import { BaseWeapon } from './BaseWeapon';

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
  private gfxPool: Phaser.GameObjects.Graphics[] = [];

  private acquireGfx(): Phaser.GameObjects.Graphics {
    const gfx = this.gfxPool.pop() ?? this.ctx.scene.add.graphics();
    gfx.setVisible(true);
    gfx.setDepth(9);
    return gfx;
  }

  private releaseGfx(gfx: Phaser.GameObjects.Graphics): void {
    gfx.clear();
    gfx.setVisible(false);
    this.gfxPool.push(gfx);
  }

  protected getCooldown(weapon: WeaponInstance, player: Player): number {
    return super.getCooldown(weapon, player) * (1 - player.getFuryReduction());
  }

  protected fire(weapon: WeaponInstance, player: Player): void {
    const stats = this.getStats(weapon);
    const dmgMul = player.getDamageMultiplier();

    for (let i = 0; i < stats.amount; i++) {
      const angle = Math.atan2(player.facingY, player.facingX) + (i - (stats.amount - 1) / 2) * 0.5;
      const gfx = this.acquireGfx();

      this.melees.push({
        weaponType: this.def.type,
        x: player.state.x + Math.cos(angle) * stats.area * 0.6,
        y: player.state.y + Math.sin(angle) * stats.area * 0.6,
        radius: stats.area,
        damage: Math.floor(stats.damage * dmgMul),
        duration: stats.duration * player.getDurationMultiplier(),
        age: 0,
        hitEnemies: new Set(),
        gfx,
      });
    }
  }

  protected updateActive(dt: number, player: Player): void {
    for (let i = this.melees.length - 1; i >= 0; i--) {
      const m = this.melees[i];
      m.age += dt * 1000;

      if (m.age >= m.duration) {
        this.releaseGfx(m.gfx);
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
    for (const gfx of this.gfxPool) gfx.destroy();
    this.melees.length = 0;
    this.gfxPool.length = 0;
  }
}
