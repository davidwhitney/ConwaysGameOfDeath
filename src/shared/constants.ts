// ─── World ───
export const TILE_SIZE = 32;
export const MAP_WIDTH = 2000;
export const MAP_HEIGHT = 2000;
export const WORLD_WIDTH = MAP_WIDTH * TILE_SIZE;   // 64000
export const WORLD_HEIGHT = MAP_HEIGHT * TILE_SIZE;  // 64000

// ─── Player ───
export const PLAYER_SIZE = 16;
export const PLAYER_BASE_HP = 100;
export const PLAYER_BASE_SPEED = 150;
export const PLAYER_INVINCIBLE_MS = 500;
export const PLAYER_PICKUP_RANGE = 20;
export const MAX_WEAPONS = 6;
export const MAX_EFFECTS = 6;
export const MAX_LEVEL = 100;
export const MAX_WEAPON_LEVEL = 8;
export const MAX_EFFECT_LEVEL = 5;

// ─── Enemies ───
export const ENEMY_MAX_ACTIVE = 800;
export const ENEMY_POOL_INITIAL = 200;
export const ENEMY_SPAWN_RANGE_MIN = 500;
export const ENEMY_SPAWN_RANGE_MAX = 900;
export const ENEMY_DESPAWN_RANGE = 1200;

// ─── XP Drop ───
export const XP_DROP_BASE_CHANCE = 0.70;
export const XP_DROP_LUCK_BONUS = 0.06; // per luck level

// ─── Gold Drop ───
export const GOLD_DROP_BASE_CHANCE = 0.10;
export const GOLD_DROP_LUCK_BONUS = 0.04; // per luck level

// ─── Reroll ───
export const GOLD_REROLL_BASE_COST = 10;
export const GOLD_REROLL_COST_MULTIPLIER = 1.10; // 10% more each time

// ─── CA / Spawning ───
export const CA_SPAWN_WIDTH = 64;
export const CA_SPAWN_HEIGHT = 64;
export const CA_SPAWN_TICK_MS = 500;

// ─── Map Generation CA ───
export const CA_MAP_ITERATIONS = 6;
export const CA_MAP_FILL_CHANCE = 0.39; // more open than default but not barren

// ─── Camera ───
export const CAMERA_ZOOM = 1.25;

// ─── Physics ───
export const SPATIAL_CELL_SIZE = 64;

// ─── Game ───
export const GAME_DURATION_MS = 30 * 60 * 1000; // 30 minutes

// ─── XP ───
export const XP_BASE = 5;
export const XP_GROWTH = 0.2; // quadratic coefficient

// ─── Boss ───
export const BOSS_HP_MULTIPLIER = 10;
export const BOSS_SIZE_MULTIPLIER = 4;
export const BOSS_SPAWN_DISTANCE = 600;
export const BOSS_KILL_HEAL_PCT = 0.5;
export const BOSS_SPAWN_BASE_CHANCE = 0.10;
export const BOSS_SPAWN_LUCK_DIVISOR = 0.35;
export const BOSS_SPAWN_MIN_PROGRESS = 0.25;

// ─── Healing ───
export const HEAL_GEM_PCT = 0.25;
export const LEVELUP_LUCK_BASE_HEAL_PCT = 0.05;
export const LEVELUP_LUCK_HEAL_SCALING = 0.15;

// ─── Scatter Health Gems ───
export const SCATTER_BASE_COUNT = 3;
export const SCATTER_LUCK_BONUS = 2;
export const SCATTER_MAX_COUNT = 20;

// ─── Enemy Scaling ───
export const ENEMY_HP_SCALING = 7.0;
export const ENEMY_DMG_SCALING = 3.6;

// ─── Combat ───
export const CRIT_DAMAGE_MULTIPLIER = 2.0;

// ─── Network ───
export const NET_INTERPOLATION_BUFFER_MS = 100;
export const MAX_PLAYERS_PER_ROOM = 4;
