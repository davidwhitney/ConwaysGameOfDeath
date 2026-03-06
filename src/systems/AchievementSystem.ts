import type Phaser from 'phaser';
import type { GameSystem } from './GameSystem';
import type { UpdateContext } from './UpdateContext';
import { GameEvents } from './GameEvents';
import { ACHIEVEMENTS } from '../achievements';
import { getAchievements, unlockAchievement, loadStats, mergeStats, type Stats } from '../ui/saveData';
import { EnemyType } from '../types';
import { WEAPON_DEFS } from '../entities/weapons';
import type { Player } from '../entities/Player';

const BANNER_SLIDE_MS = 400;
const BANNER_HOLD_MS = 3000;

export class AchievementSystem implements GameSystem {
  private scene: Phaser.Scene;
  private timer = 0;
  private unlocked: Set<string>;
  private lastLevel = 0;
  private wasAlive = true;
  private static readonly INTERVAL = 10_000;

  private sessionTotalKills = 0;
  private sessionKillsByType: Record<number, number> = {};
  private sessionDeathKills = 0;
  private player: Player | null = null;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.unlocked = new Set(getAchievements());

    GameEvents.on(scene.events, 'achievement', (id) => this.grant(id));
    GameEvents.on(scene.events, 'enemy-killed', (enemy) => {
      this.sessionTotalKills++;
      this.sessionKillsByType[enemy.state.type] = (this.sessionKillsByType[enemy.state.type] ?? 0) + 1;
      if (enemy.state.type === EnemyType.Death) {
        this.sessionDeathKills++;
        this.checkDeathConditionals();
      }
    });
  }

  update(ctx: UpdateContext): void {
    if (!this.player) this.player = ctx.player;

    // Detect level-up
    const currentLevel = ctx.player.state.level;
    if (currentLevel !== this.lastLevel) {
      this.lastLevel = currentLevel;
      this.evaluate(ctx);
    }

    // Detect death
    if (!ctx.player.state.alive && this.wasAlive) {
      this.wasAlive = false;
      this.evaluate(ctx);
    } else if (ctx.player.state.alive) {
      this.wasAlive = true;
    }

    // Periodic check
    this.timer += ctx.time.deltaMs;
    if (this.timer >= AchievementSystem.INTERVAL) {
      this.timer = 0;
      this.evaluate(ctx);
    }
  }

  /** Run all state-based achievement checks. */
  evaluate(ctx: UpdateContext): void {
    const cumulativeStats = this.buildCumulativeStats(0, false);
    for (const def of ACHIEVEMENTS) {
      if (this.unlocked.has(def.id)) continue;
      if (def.evaluate && def.evaluate(ctx)) {
        this.grant(def.id);
      } else if (def.evaluateWithStats && def.evaluateWithStats(ctx, cumulativeStats)) {
        this.grant(def.id);
      }
    }
  }

  /** Flush session stats into persistent storage. Call at end of game. */
  flushStats(elapsedMs: number, victory: boolean): void {
    const session: Stats = {
      totalKills: this.sessionTotalKills,
      killsByType: { ...this.sessionKillsByType },
      deathKills: this.sessionDeathKills,
      totalPlayTimeMs: elapsedMs,
      victories: victory ? 1 : 0,
    };
    mergeStats(session);
  }

  private buildCumulativeStats(elapsedMs: number, victory: boolean): Stats {
    const persisted = loadStats();
    return {
      totalKills: persisted.totalKills + this.sessionTotalKills,
      killsByType: mergeKillsByType(persisted.killsByType, this.sessionKillsByType),
      deathKills: persisted.deathKills + this.sessionDeathKills,
      totalPlayTimeMs: persisted.totalPlayTimeMs + elapsedMs,
      victories: persisted.victories + (victory ? 1 : 0),
    };
  }

  private checkDeathConditionals(): void {
    if (!this.player) return;
    const weapons = this.player.state.weapons;

    // Minimalist: kill Death with fewer than 4 weapons
    if (!this.unlocked.has('death-undergeared') && weapons.length < 4) {
      this.grant('death-undergeared');
    }

    // Hands Only: kill Death with no AoE weapons
    if (!this.unlocked.has('death-no-aoe')) {
      const hasAoe = weapons.some(w => WEAPON_DEFS[w.type]?.category === 'aoe');
      if (!hasAoe) {
        this.grant('death-no-aoe');
      }
    }
  }

  private grant(id: string): void {
    if (this.unlocked.has(id)) return;
    if (unlockAchievement(id)) {
      this.unlocked.add(id);
      const def = ACHIEVEMENTS.find(a => a.id === id);
      if (def) showAchievementBanner(def.name, def.description);
      GameEvents.sfx('achievement-unlocked');
    }
  }

  destroy(): void {
    GameEvents.off(this.scene.events, 'achievement');
    GameEvents.off(this.scene.events, 'enemy-killed');
  }
}

function mergeKillsByType(a: Record<number, number>, b: Record<number, number>): Record<number, number> {
  const result: Record<number, number> = { ...a };
  for (const [key, val] of Object.entries(b)) {
    result[key as unknown as number] = (result[key as unknown as number] ?? 0) + val;
  }
  return result;
}

function showAchievementBanner(name: string, description: string): void {
  const banner = document.createElement('div');
  banner.style.cssText = `
    position: fixed;
    top: 0;
    left: 50%;
    transform: translateX(-50%) translateY(-100%);
    z-index: 9999;
    pointer-events: none;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 2px;
    padding: 12px 28px;
    background: rgba(17, 17, 51, 0.95);
    border: 2px solid #ffcc00;
    border-top: none;
    border-radius: 0 0 8px 8px;
    font-family: monospace;
    text-align: center;
    transition: transform ${BANNER_SLIDE_MS}ms cubic-bezier(0.34, 1.56, 0.64, 1);
  `;

  banner.innerHTML = `
    <div style="font-size: 11px; color: #ffcc00; font-weight: bold; letter-spacing: 1px;">ACHIEVEMENT UNLOCKED</div>
    <div style="font-size: 17px; color: #ffffff; font-weight: bold;">${esc(name)}</div>
    <div style="font-size: 11px; color: #aaaacc;">${esc(description)}</div>
  `;

  document.body.appendChild(banner);

  // Slide in
  requestAnimationFrame(() => {
    banner.style.transform = 'translateX(-50%) translateY(0)';
  });

  // Hold, then slide out and remove
  setTimeout(() => {
    banner.style.transition = `transform ${BANNER_SLIDE_MS}ms ease-in`;
    banner.style.transform = 'translateX(-50%) translateY(-100%)';
    setTimeout(() => banner.remove(), BANNER_SLIDE_MS);
  }, BANNER_SLIDE_MS + BANNER_HOLD_MS);
}

function esc(s: string): string {
  const el = document.createElement('span');
  el.textContent = s;
  return el.innerHTML;
}
