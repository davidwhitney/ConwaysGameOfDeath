import type { WeaponInstance } from '../../../types';
import { distanceSq } from '../../../utils/math';
import type { Player } from '../../../entities/Player';
import type { Enemy } from '../../../entities/Enemy';
import { BaseAoEWeapon } from '../BaseAoEWeapon';
import { GfxPool } from '../GfxPool';
import { WeaponContext } from '../WeaponContext';
import { WeaponDef } from '../../../types';

const CHAIN_RANGE = 150;
const BOLT_DURATION = 250;

interface ActiveBolt {
  points: { x: number; y: number }[];
  age: number;
  gfx: Phaser.GameObjects.Graphics;
}

export class LightningWeapon extends BaseAoEWeapon {
  private bolts: ActiveBolt[] = [];
  private boltPool: GfxPool;

  constructor(ctx: WeaponContext, def: WeaponDef) {
    super(ctx, def);
    this.boltPool = new GfxPool(ctx.scene, 8);
  }

  protected override fire(weapon: WeaponInstance, player: Player): void {
    const stats = this.getStats(weapon);
    const dmgMul = player.getDamageMultiplier();
    const damage = Math.floor(stats.damage * dmgMul);
    const chainCount = weapon.level;

    for (let i = 0; i < stats.amount; i++) {
      const first = this.findNearestEnemy(player.state.x, player.state.y);
      if (!first) return;

      const hit = new Set<number>();
      const points: { x: number; y: number }[] = [
        { x: player.state.x, y: player.state.y },
      ];

      let current: Enemy = first;
      for (let hop = 0; hop <= chainCount; hop++) {
        this.hitEnemy(current, damage, this.def.type, player);
        hit.add(current.state.id);
        points.push({ x: current.state.x, y: current.state.y });

        if (hop < chainCount) {
          const next = this.findChainTarget(current.state.x, current.state.y, hit);
          if (!next) break;
          current = next;
        }
      }

      this.bolts.push({ points, age: 0, gfx: this.boltPool.acquire() });
    }
  }

  private findChainTarget(x: number, y: number, exclude: Set<number>): Enemy | null {
    const enemies = this.ctx.enemyPool.getEnemiesInRadius(x, y, CHAIN_RANGE);
    const point = { x, y };
    let best: Enemy | null = null;
    let bestDist = Infinity;
    for (const e of enemies) {
      if (exclude.has(e.state.id) || !e.state.alive) continue;
      const d = distanceSq(e.state, point);
      if (d < bestDist) { bestDist = d; best = e; }
    }
    return best;
  }

  protected override updateActive(dt: number, _player: Player): void {
    super.updateActive(dt, _player);

    for (let i = this.bolts.length - 1; i >= 0; i--) {
      const bolt = this.bolts[i];
      bolt.age += dt * 1000;

      if (bolt.age >= BOLT_DURATION) {
        this.boltPool.release(bolt.gfx);
        this.bolts.splice(i, 1);
        continue;
      }

      const alpha = 1 - bolt.age / BOLT_DURATION;
      bolt.gfx.clear();

      for (let j = 0; j < bolt.points.length - 1; j++) {
        this.drawBoltSegment(bolt.gfx, bolt.points[j], bolt.points[j + 1], alpha);
      }
    }
  }

  private drawBoltSegment(
    gfx: Phaser.GameObjects.Graphics,
    from: { x: number; y: number },
    to: { x: number; y: number },
    alpha: number,
  ): void {
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const dist = Math.sqrt(dx * dx + dy * dy) || 1;
    const segments = Math.max(3, Math.floor(dist / 20));
    const perpX = -dy / dist;
    const perpY = dx / dist;

    // Wide outer glow
    this.drawJaggedLine(gfx, from, dx, dy, perpX, perpY, segments, 8, 0xffff44, alpha * 0.15, 24);
    // Mid glow
    this.drawJaggedLine(gfx, from, dx, dy, perpX, perpY, segments, 4, 0xffff88, alpha * 0.5, 20);
    // Hot bright core
    this.drawJaggedLine(gfx, from, dx, dy, perpX, perpY, segments, 2, 0xffffcc, alpha * 1.0, 12);
  }

  private drawJaggedLine(
    gfx: Phaser.GameObjects.Graphics,
    from: { x: number; y: number },
    dx: number, dy: number,
    perpX: number, perpY: number,
    segments: number,
    lineWidth: number, color: number, alpha: number, jitterAmount: number,
  ): void {
    gfx.lineStyle(lineWidth, color, alpha);
    gfx.beginPath();
    gfx.moveTo(from.x, from.y);
    for (let s = 1; s < segments; s++) {
      const t = s / segments;
      const jitter = (Math.random() - 0.5) * jitterAmount;
      gfx.lineTo(
        from.x + dx * t + perpX * jitter,
        from.y + dy * t + perpY * jitter,
      );
    }
    gfx.lineTo(from.x + dx, from.y + dy);
    gfx.strokePath();
  }

  override destroy(): void {
    super.destroy();
    for (const b of this.bolts) b.gfx.destroy();
    this.bolts.length = 0;
    this.boltPool.destroy();
  }
}
