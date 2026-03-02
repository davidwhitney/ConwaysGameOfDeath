// Types
export * from './types';
export * from './constants';

// Entities
export { ENEMY_DEFS } from './entities/enemies';
export { WEAPON_DEFS } from './entities/weapons';
export { EFFECT_DEFS } from './entities/effects';

// Systems
export { CellularAutomaton } from './systems/cellular-automaton';
export { generateMap, iterateMap, ensureWalkable, isWalkable, worldToTile } from './systems/map-generator';
export { SpawnManager, PATTERNS, type SpawnEvent } from './systems/spawn-manager';
export { xpForLevel, totalXpToLevel, getWeaponStats, generateLevelUpOptions, generatePostMaxOptions } from './systems/leveling';
export { SpatialHash, type SpatialEntity } from './systems/physics';

// Utils
export { SeededRandom } from './utils/seeded-random';
export { distance, distanceSq, normalize, directionTo, clamp, lerp, lerpVec2, angleToVec2, vec2ToAngle, circlesOverlap, pointInRect } from './utils/math';
