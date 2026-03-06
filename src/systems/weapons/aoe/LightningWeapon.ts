import Phaser from 'phaser';
import type { WeaponInstance } from '../../../types';
import { distanceSq } from '../../../utils/math';
import type { Player } from '../../../entities/Player';
import type { Enemy } from '../../../entities/Enemy';
import { BaseAoEWeapon } from '../BaseAoEWeapon';
import { WeaponContext } from '../WeaponContext';
import { WeaponDef } from '../../../types';

const CHAIN_RANGE = 150;
const BOLT_DURATION = 250;
const MAX_SEGMENTS = 16;

interface BoltSegment {
  from: { x: number; y: number };
  to: { x: number; y: number };
  dx: number;
  dy: number;
  perpX: number;
  perpY: number;
  segCount: number;
  /** Pre-baked jitter offsets (one per segment midpoint) */
  jitter: Float32Array;
}

interface ActiveBolt {
  segments: BoltSegment[];
  strikePoints: { x: number; y: number }[];
  age: number;
}

export class LightningWeapon extends BaseAoEWeapon {
  private bolts: ActiveBolt[] = [];
  private boltGfx: Phaser.GameObjects.Graphics;

  constructor(ctx: WeaponContext, def: WeaponDef) {
    super(ctx, def);
    this.boltGfx = ctx.scene.add.graphics();
    this.boltGfx.setDepth(8);
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

      // Pre-bake segment geometry and jitter at fire time
      const segments: BoltSegment[] = [];
      for (let j = 0; j < points.length - 1; j++) {
        const from = points[j];
        const to = points[j + 1];
        const dx = to.x - from.x;
        const dy = to.y - from.y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        const segCount = Math.min(MAX_SEGMENTS, Math.max(3, Math.floor(dist / 20)));
        const perpX = -dy / dist;
        const perpY = dx / dist;
        // Pre-generate normalized jitter values (-0.5 to 0.5) for each midpoint
        const jitter = new Float32Array(segCount);
        for (let s = 1; s < segCount; s++) {
          jitter[s] = (Math.random() - 0.5);
        }
        segments.push({ from, to, dx, dy, perpX, perpY, segCount, jitter });
      }

      const strikePoints = points.slice(1);
      this.bolts.push({ segments, strikePoints, age: 0 });
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

    this.boltGfx.clear();

    for (let i = this.bolts.length - 1; i >= 0; i--) {
      const bolt = this.bolts[i];
      bolt.age += dt * 1000;

      if (bolt.age >= BOLT_DURATION) {
        this.bolts.splice(i, 1);
        continue;
      }

      const alpha = 1 - bolt.age / BOLT_DURATION;

      for (const seg of bolt.segments) {
        this.drawBoltSegment(this.boltGfx, seg, alpha);
      }
      // Glow at each strike point
      for (const pt of bolt.strikePoints) {
        this.boltGfx.fillStyle(0xffff88, alpha * 0.2);
        this.boltGfx.fillCircle(pt.x, pt.y, 12);
        this.boltGfx.fillStyle(0xffffff, alpha * 0.4);
        this.boltGfx.fillCircle(pt.x, pt.y, 5);
      }
    }
  }

  private drawBoltSegment(
    gfx: Phaser.GameObjects.Graphics,
    seg: BoltSegment,
    alpha: number,
  ): void {
    // Glow
    this.drawJaggedLine(gfx, seg, 5, 0xffff88, alpha * 0.4, 20);
    // Hot bright core
    this.drawJaggedLine(gfx, seg, 2, 0xffffcc, alpha * 1.0, 12);
  }

  private drawJaggedLine(
    gfx: Phaser.GameObjects.Graphics,
    seg: BoltSegment,
    lineWidth: number, color: number, alpha: number, jitterScale: number,
  ): void {
    gfx.lineStyle(lineWidth, color, alpha);
    gfx.beginPath();
    gfx.moveTo(seg.from.x, seg.from.y);
    for (let s = 1; s < seg.segCount; s++) {
      const t = s / seg.segCount;
      const jitter = seg.jitter[s] * jitterScale;
      gfx.lineTo(
        seg.from.x + seg.dx * t + seg.perpX * jitter,
        seg.from.y + seg.dy * t + seg.perpY * jitter,
      );
    }
    gfx.lineTo(seg.from.x + seg.dx, seg.from.y + seg.dy);
    gfx.strokePath();
  }

  override destroy(): void {
    super.destroy();
    this.bolts.length = 0;
    this.boltGfx.destroy();
  }
}
