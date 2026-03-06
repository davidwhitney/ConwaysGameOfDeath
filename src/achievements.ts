import type { UpdateContext } from './systems/UpdateContext';
import type { Stats } from './ui/saveData';
import { EFFECT_DEFS } from './entities/effects';
import { ENEMY_DEFS } from './entities/enemies';
import { EnemyType } from './types';
import { MAX_WEAPONS, MAX_EFFECTS, MAX_WEAPON_LEVEL } from './constants';
import { formatNumber } from './ui/format';

export interface AchievementDef {
  id: string;
  name: string;
  description: string;
  silent?: boolean;
  evaluate?: (ctx: UpdateContext) => boolean;
  evaluateWithStats?: (ctx: UpdateContext, stats: Stats) => boolean;
}

function buildAchievements(): AchievementDef[] {
  const defs: AchievementDef[] = [];

  // 1. killed-death (event-driven, no evaluate)
  defs.push({ id: 'killed-death', name: 'Killed Death', description: 'Destroy Death using a Death Mask' });

  // 2. Max all weapon slots — "Fully Armed"
  defs.push({
    id: 'fully-armed',
    name: 'Fully Armed',
    description: `Fill all ${MAX_WEAPONS} weapon slots at max level`,
    evaluate: (ctx) =>
      ctx.player.state.weapons.length >= MAX_WEAPONS &&
      ctx.player.state.weapons.every(w => w.level >= MAX_WEAPON_LEVEL),
  });

  // 5. Max all effect slots — "Fully Buffed"
  defs.push({
    id: 'fully-buffed',
    name: 'Fully Buffed',
    description: `Fill all ${MAX_EFFECTS} effect slots at max level`,
    evaluate: (ctx) => {
      if (ctx.player.state.effects.length < MAX_EFFECTS) return false;
      return ctx.player.state.effects.every(e => {
        const def = EFFECT_DEFS[e.type];
        return def && e.level >= def.maxLevel;
      });
    },
  });

  // 6. Kill milestones (5)
  const killMilestones: [number, string][] = [
    [10_000, 'Slayer'],
    [50_000, 'Mass Extinction'],
    [100_000, 'Centurion'],
    [500_000, 'Armageddon'],
    [1_000_000, 'Apocalypse'],
  ];
  for (const [threshold, name] of killMilestones) {
    defs.push({
      id: `kills-${threshold}`,
      name,
      description: `Kill ${formatNumber(threshold)} enemies total`,
      evaluateWithStats: (_ctx, stats) => stats.totalKills >= threshold,
    });
  }

  // 7. Per-enemy-type 10k kills (excl. Death) (10)
  for (const e of ENEMY_DEFS) {
    if (e.type === EnemyType.Death) continue;
    defs.push({
      id: `kills-type-${e.type}`,
      name: `${e.name} Exterminator`,
      description: `Kill 10,000 ${e.name}s`,
      evaluateWithStats: (_ctx, stats) => (stats.killsByType[e.type] ?? 0) >= 10_000,
    });
  }

  // 8. Death kills 100 — "Death Defier"
  defs.push({
    id: 'death-kills-100',
    name: 'Death Defier',
    description: 'Kill Death 100 times',
    evaluateWithStats: (_ctx, stats) => stats.deathKills >= 100,
  });

  // 9. Kill Death undergeared — "Minimalist" (reactive, no evaluate)
  defs.push({ id: 'death-undergeared', name: 'Minimalist', description: 'Kill Death with fewer than 4 weapons' });

  // 10. Kill Death no AOE — "Hands Only" (reactive, no evaluate)
  defs.push({ id: 'death-no-aoe', name: 'Hands Only', description: 'Kill Death with no AoE weapons' });

  // 11. Extracted (event-driven, no evaluate)
  defs.push({ id: 'extracted', name: 'Extracted', description: 'Escape through the exit gate' });

  // 12. Survive 15 min — "Half Time"
  defs.push({
    id: 'survive-15',
    name: 'Half Time',
    description: 'Survive for 15 minutes',
    evaluate: (ctx) => ctx.time.elapsed >= 15 * 60 * 1000,
  });

  // 12. Survive 30+ min — "Full Time"
  defs.push({
    id: 'survive-30',
    name: 'Full Time',
    description: 'Survive for 30 minutes',
    evaluate: (ctx) => ctx.time.elapsed >= 30 * 60 * 1000,
  });

  // 13. 8h play time — "Working 9-5"
  defs.push({
    id: 'playtime-8h',
    name: 'Working 9-5',
    description: 'Play for 8 hours total',
    evaluateWithStats: (_ctx, stats) => stats.totalPlayTimeMs >= 8 * 60 * 60 * 1000,
  });

  // 14. 24h play time — "All Day and All Night"
  defs.push({
    id: 'playtime-24h',
    name: 'All Day and All Night',
    description: 'Play for 24 hours total',
    evaluateWithStats: (_ctx, stats) => stats.totalPlayTimeMs >= 24 * 60 * 60 * 1000,
  });

  return defs;
}

export const ACHIEVEMENTS: AchievementDef[] = buildAchievements();
export const ACHIEVEMENTS_BY_ID: ReadonlyMap<string, AchievementDef> = new Map(ACHIEVEMENTS.map(a => [a.id, a]));
