import type Phaser from 'phaser';
import type { GameSystem } from './GameSystem';
import type { UpdateContext } from './UpdateContext';
import { GameEvents } from './GameEvents';
import { ACHIEVEMENTS, ACHIEVEMENTS_BY_ID } from '../achievements';
import { getAchievements, unlockAchievement, loadStats, mergeStats, type Stats } from '../ui/saveData';
import { showAchievementBanner } from '../ui/AchievementBanner';
import { EnemyType } from '../types';
import { WEAPON_DEFS } from '../entities/weapons';
import type { Player } from '../entities/Player';

export class AchievementSystem implements GameSystem {
  private scene: Phaser.Scene;
  private unlocked: Set<string>;
  private lastLevel = 0;
  private wasAlive = true;
  private periodicTimer = 0;

  private persistedStats: Stats;
  private sessionTotalKills = 0;
  private sessionKillsByType: Record<number, number> = {};
  private sessionDeathKills = 0;
  private player: Player;

  constructor(scene: Phaser.Scene, player: Player) {
    this.scene = scene;
    this.player = player;
    this.unlocked = new Set(getAchievements());
    this.persistedStats = loadStats();

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
    // Detect level-up
    const currentLevel = ctx.player.state.level;
    if (currentLevel !== this.lastLevel) {
      this.lastLevel = currentLevel;
      this.evaluate(ctx);
    }

    // Periodic check every 30s for time-based achievements
    this.periodicTimer += ctx.time.deltaMs;
    if (this.periodicTimer >= 30_000) {
      this.periodicTimer = 0;
      this.evaluate(ctx);
    }

    // Detect death
    if (!ctx.player.state.alive && this.wasAlive) {
      this.wasAlive = false;
      this.evaluate(ctx);
    } else if (ctx.player.state.alive) {
      this.wasAlive = true;
    }
  }

  /** Run all state-based achievement checks. */
  evaluate(ctx: UpdateContext): void {
    const cumulativeStats = this.buildCumulativeStats();
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

  private buildCumulativeStats(): Stats {
    return {
      totalKills: this.persistedStats.totalKills + this.sessionTotalKills,
      killsByType: mergeKillsByType(this.persistedStats.killsByType, this.sessionKillsByType),
      deathKills: this.persistedStats.deathKills + this.sessionDeathKills,
      totalPlayTimeMs: this.persistedStats.totalPlayTimeMs,
      victories: this.persistedStats.victories,
    };
  }

  private checkDeathConditionals(): void {
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
      const def = ACHIEVEMENTS_BY_ID.get(id);
      if (def && !def.silent) {
        showAchievementBanner(def.name, def.description);
        GameEvents.sfx('achievement-unlocked');
      }
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
    const k = Number(key);
    result[k] = (result[k] ?? 0) + val;
  }
  return result;
}
