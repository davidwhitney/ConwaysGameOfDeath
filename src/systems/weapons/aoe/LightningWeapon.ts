import type { WeaponInstance } from '../../../shared';
import type { Player } from '../../../entities/Player';
import type { Enemy } from '../../../entities/Enemy';
import { BaseAoEWeapon } from '../BaseAoEWeapon';

const CHAIN_RANGE = 150;
const BOLT_DURATION = 250;

interface ActiveBolt {
  points: { x: number; y: number }[];
  age: number;
  gfx: Phaser.GameObjects.Graphics;
}

export class LightningWeapon extends BaseAoEWeapon {
  private bolts: ActiveBolt[] = [];
  private boltPool: Phaser.GameObjects.Graphics[] = [];

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

      this.spawnBolt(points);
    }
  }

  private findChainTarget(x: number, y: number, exclude: Set<number>): Enemy | null {
    const enemies = this.ctx.enemyPool.getEnemiesInRadius(x, y, CHAIN_RANGE);
    let best: Enemy | null = null;
    let bestDist = Infinity;
    for (const e of enemies) {
      if (exclude.has(e.state.id) || !e.state.alive) continue;
      const dx = e.state.x - x;
      const dy = e.state.y - y;
      const d = dx * dx + dy * dy;
      if (d < bestDist) { bestDist = d; best = e; }
    }
    return best;
  }

  private spawnBolt(points: { x: number; y: number }[]): void {
    const gfx = this.boltPool.pop() ?? this.ctx.scene.add.graphics();
    gfx.setVisible(true);
    gfx.setDepth(8);
    this.bolts.push({ points, age: 0, gfx });
  }

  protected override updateActive(dt: number, _player: Player): void {
    // Update AoE zones from base class (if any remain from before)
    super.updateActive(dt, _player);

    // Update lightning bolts
    for (let i = this.bolts.length - 1; i >= 0; i--) {
      const bolt = this.bolts[i];
      bolt.age += dt * 1000;

      if (bolt.age >= BOLT_DURATION) {
        bolt.gfx.clear();
        bolt.gfx.setVisible(false);
        this.boltPool.push(bolt.gfx);
        this.bolts.splice(i, 1);
        continue;
      }

      const alpha = 1 - bolt.age / BOLT_DURATION;
      bolt.gfx.clear();

      // Draw jagged bolt between each pair of points
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

    // Glow
    gfx.lineStyle(4, 0xffff88, alpha * 0.3);
    gfx.beginPath();
    gfx.moveTo(from.x, from.y);
    for (let s = 1; s < segments; s++) {
      const t = s / segments;
      const jitter = (Math.random() - 0.5) * 20;
      gfx.lineTo(
        from.x + dx * t + perpX * jitter,
        from.y + dy * t + perpY * jitter,
      );
    }
    gfx.lineTo(to.x, to.y);
    gfx.strokePath();

    // Core
    gfx.lineStyle(2, 0xffff00, alpha * 0.8);
    gfx.beginPath();
    gfx.moveTo(from.x, from.y);
    for (let s = 1; s < segments; s++) {
      const t = s / segments;
      const jitter = (Math.random() - 0.5) * 12;
      gfx.lineTo(
        from.x + dx * t + perpX * jitter,
        from.y + dy * t + perpY * jitter,
      );
    }
    gfx.lineTo(to.x, to.y);
    gfx.strokePath();
  }

  override destroy(): void {
    super.destroy();
    for (const b of this.bolts) b.gfx.destroy();
    for (const gfx of this.boltPool) gfx.destroy();
    this.bolts.length = 0;
    this.boltPool.length = 0;
  }
}
