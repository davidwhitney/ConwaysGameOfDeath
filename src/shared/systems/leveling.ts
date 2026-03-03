import { XP_BASE, XP_GROWTH, MAX_LEVEL, MAX_WEAPONS, MAX_EFFECTS, MAX_WEAPON_LEVEL, MAX_EFFECT_LEVEL } from '../constants';
import { WeaponType, EffectType, type LevelUpOption, type PlayerState, type WeaponInstance, type EffectInstance, type WeaponDef, type EffectDef } from '../types';
import { WEAPON_DEFS } from '../entities/weapons';
import { EFFECT_DEFS } from '../entities/effects';

/** Calculate XP needed for a given level (quadratic curve) */
export function xpForLevel(level: number): number {
  // level 2 = 5xp, level 100 ≈ 2000xp
  return Math.floor(XP_BASE + XP_GROWTH * (level - 1) * (level - 1));
}

/** Total XP from level 1 to given level */
export function totalXpToLevel(level: number): number {
  let total = 0;
  for (let l = 2; l <= level; l++) {
    total += xpForLevel(l);
  }
  return total;
}

/** Calculate weapon stats at a given level */
export function getWeaponStats(def: WeaponDef, level: number) {
  const lvl = level - 1; // 0-indexed for scaling
  return {
    damage: Math.floor(def.baseDamage * (1 + def.levelScaling.damage * lvl)),
    cooldown: Math.max(100, def.baseCooldown * (1 - def.levelScaling.cooldown * lvl)),
    area: def.baseArea * (1 + def.levelScaling.area * lvl),
    amount: def.baseAmount + Math.floor(lvl / 2) * def.levelScaling.amount,
    pierce: def.basePierce + Math.floor((lvl + 1) / 2) * def.levelScaling.pierce,
    duration: def.baseDuration * (1 + def.levelScaling.duration * lvl),
    speed: def.baseSpeed,
  };
}

/**
 * Generate level-up choices.
 * Rules:
 * - 3 choices offered
 * - Can offer new weapons (if < MAX_WEAPONS) or upgrade existing ones (if < max level)
 * - Can offer new effects (if < MAX_EFFECTS) or upgrade existing ones
 * - Owned items are weighted 3x more likely to appear
 */
export function generateLevelUpOptions(
  weapons: WeaponInstance[],
  effects: EffectInstance[],
  rng: () => number,
): LevelUpOption[] {
  const pool: Array<{ option: LevelUpOption; weight: number }> = [];

  const categories: Array<{
    kind: 'weapon' | 'effect';
    owned: Array<{ type: number; level: number }>;
    defs: Array<{ type: number; name: string; description: string }>;
    maxSlots: number;
    maxLevel: (type: number) => number;
    upgradeDesc: (type: number, level: number) => string;
  }> = [
    {
      kind: 'weapon',
      owned: weapons,
      defs: WEAPON_DEFS,
      maxSlots: MAX_WEAPONS,
      maxLevel: () => MAX_WEAPON_LEVEL,
      upgradeDesc: (_t, lvl) => `Level ${lvl}: +damage, improved stats`,
    },
    {
      kind: 'effect',
      owned: effects,
      defs: EFFECT_DEFS,
      maxSlots: MAX_EFFECTS,
      maxLevel: (type) => EFFECT_DEFS[type].maxLevel,
      upgradeDesc: (type, lvl) => `Level ${lvl}: ${EFFECT_DEFS[type].description}`,
    },
  ];

  for (const cat of categories) {
    // Upgrades for owned items (weighted 3x)
    for (const item of cat.owned) {
      if (item.level < cat.maxLevel(item.type)) {
        const def = cat.defs[item.type];
        pool.push({
          option: {
            kind: cat.kind, type: item.type, newLevel: item.level + 1,
            name: def.name, description: cat.upgradeDesc(item.type, item.level + 1),
          },
          weight: 3,
        });
      }
    }

    // New items (if slots available)
    if (cat.owned.length < cat.maxSlots) {
      const ownedTypes = new Set(cat.owned.map(i => i.type));
      for (const def of cat.defs) {
        if (!ownedTypes.has(def.type)) {
          pool.push({
            option: {
              kind: cat.kind, type: def.type, newLevel: 1,
              name: def.name, description: def.description,
            },
            weight: 1,
          });
        }
      }
    }
  }

  // Weighted random selection of 3 unique options
  const selected: LevelUpOption[] = [];
  const remaining = [...pool];

  while (selected.length < 3 && remaining.length > 0) {
    const totalWeight = remaining.reduce((sum, item) => sum + item.weight, 0);
    let roll = rng() * totalWeight;
    let idx = 0;
    for (let i = 0; i < remaining.length; i++) {
      roll -= remaining[i].weight;
      if (roll <= 0) { idx = i; break; }
    }
    selected.push(remaining[idx].option);
    remaining.splice(idx, 1);
  }

  return selected;
}

/**
 * Generate post-max-level options: gold or 25% HP recovery.
 */
export function generatePostMaxOptions(level: number): LevelUpOption[] {
  const goldAmount = 10 + Math.floor(level / 10) * 5;
  return [
    {
      kind: 'gold',
      type: -1,
      newLevel: 0,
      name: 'Gold',
      description: `Collect ${goldAmount} gold`,
    },
    {
      kind: 'heal',
      type: -1,
      newLevel: 0,
      name: 'Recovery',
      description: 'Recover 25% of max HP',
    },
  ];
}

/** Apply a level-up choice to player state */
export function applyLevelUpChoice(state: PlayerState, choice: LevelUpOption): void {
  switch (choice.kind) {
    case 'weapon': {
      const existing = state.weapons.find(w => w.type === choice.type);
      if (existing) existing.level = choice.newLevel;
      else state.weapons.push({ type: choice.type as WeaponType, level: 1, cooldownTimer: 0 });
      break;
    }
    case 'effect': {
      const existing = state.effects.find(e => e.type === choice.type);
      if (existing) existing.level = choice.newLevel;
      else state.effects.push({ type: choice.type as number, level: 1 });
      break;
    }
    case 'gold':
      state.gold += 10 + Math.floor(state.level / 10) * 5;
      break;
    case 'heal':
      state.hp = Math.min(state.maxHp, state.hp + state.maxHp * 0.25);
      break;
  }
}
