import type { WeaponInstance } from '../../shared';
import type { Player } from '../../entities/Player';
import { BaseWeapon } from './BaseWeapon';
import { GfxPool } from './GfxPool';
import type { Enemy } from '../../entities/Enemy';

interface ActiveAoE {
  weaponType: number;
  x: number;
  y: number;
  radius: number;
  damage: number;
  duration: number;
  age: number;
  tickTimer: number;
  gfx: Phaser.GameObjects.Graphics;
}

export class BaseAoEWeapon extends BaseWeapon {
  protected override appliesKnockback = false;
  protected aoes: ActiveAoE[] = [];
  private pool: GfxPool;

  constructor(ctx: import('./WeaponContext').WeaponContext, def: import('../../shared').WeaponDef) {
    super(ctx, def);
    this.pool = new GfxPool(ctx.scene, 6);
  }

  protected pickTarget(player: Player): { x: number; y: number } {
    const angle = Math.random() * Math.PI * 2;
    const dist = 50 + Math.random() * 150;
    return {
      x: player.state.x + Math.cos(angle) * dist,
      y: player.state.y + Math.sin(angle) * dist,
    };
  }

  protected onTickHit(_enemy: Enemy): void {
    // Override in subclasses for per-weapon effects
  }

  protected fire(weapon: WeaponInstance, player: Player): void {
    const stats = this.getStats(weapon);
    const dmgMul = player.getDamageMultiplier();
    const auraMul = player.getAuraMultiplier();

    for (let i = 0; i < stats.amount; i++) {
      const target = this.pickTarget(player);

      this.aoes.push({
        weaponType: this.def.type,
        x: target.x,
        y: target.y,
        radius: stats.area * auraMul,
        damage: Math.floor(stats.damage * dmgMul),
        duration: Math.max(stats.duration * player.getDurationMultiplier(), 300),
        age: 0,
        tickTimer: 0,
        gfx: this.pool.acquire(),
      });
    }
  }

  protected updateActive(dt: number, player: Player): void {
    for (let i = this.aoes.length - 1; i >= 0; i--) {
      const a = this.aoes[i];
      a.age += dt * 1000;

      if (a.age >= a.duration) {
        this.pool.release(a.gfx);
        this.aoes.splice(i, 1);
        continue;
      }

      const progress = a.age / a.duration;
      const alpha = progress < 0.1 ? progress * 10 : (progress > 0.8 ? (1 - progress) * 5 : 1);
      a.gfx.clear();
      a.gfx.fillStyle(this.def.color, alpha * 0.3);
      a.gfx.fillCircle(a.x, a.y, a.radius);
      a.gfx.lineStyle(2, this.def.color, alpha * 0.6);
      a.gfx.strokeCircle(a.x, a.y, a.radius);

      a.tickTimer += dt * 1000;
      if (a.tickTimer >= 200) {
        a.tickTimer -= 200;
        const enemies = this.ctx.enemyPool.getEnemiesInRadius(a.x, a.y, a.radius);
        for (const enemy of enemies) {
          this.hitEnemy(enemy, a.damage, this.def.type, player);
          this.onTickHit(enemy);
        }
      }
    }
  }

  destroy(): void {
    for (const a of this.aoes) a.gfx.destroy();
    this.aoes.length = 0;
    this.pool.destroy();
  }
}
