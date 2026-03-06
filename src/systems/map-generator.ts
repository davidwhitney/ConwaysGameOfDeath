import { CellularAutomaton } from './cellular-automaton';
import { SeededRandom } from '../utils/seeded-random';
import { MAP_WIDTH, MAP_HEIGHT, TILE_SIZE, CA_MAP_ITERATIONS, CA_MAP_FILL_CHANCE } from '../constants';
import type { TileMap } from '../types';

/**
 * Generate a cave-style tilemap using cellular automaton.
 * Rules: B5678/S45678 - creates organic cave systems.
 *
 * Process:
 * 1. Random fill with ~48% walls
 * 2. Run CA 6 iterations to smooth into caves
 * 3. Ensure borders are walls
 * 4. Ensure spawn area at center is clear
 */
export function generateMap(seed: number): TileMap {
  const rng = new SeededRandom(seed);
  const ca = new CellularAutomaton(
    MAP_WIDTH,
    MAP_HEIGHT,
    [5, 6, 7, 8],   // Birth: 5-8 neighbors
    [4, 5, 6, 7, 8], // Survival: 4-8 neighbors
    false,            // No wrapping (borders become walls)
  );

  // Random fill
  ca.randomize(CA_MAP_FILL_CHANCE, () => rng.next());

  // Run CA iterations
  ca.run(CA_MAP_ITERATIONS);

  const data = ca.cloneData();

  // Ensure borders are walls
  for (let x = 0; x < MAP_WIDTH; x++) {
    data[x] = 1;                                  // top
    data[(MAP_HEIGHT - 1) * MAP_WIDTH + x] = 1;   // bottom
  }
  for (let y = 0; y < MAP_HEIGHT; y++) {
    data[y * MAP_WIDTH] = 1;                       // left
    data[y * MAP_WIDTH + MAP_WIDTH - 1] = 1;       // right
  }

  // Clear spawn area at center (20x20 tile region for larger map)
  const cx = Math.floor(MAP_WIDTH / 2);
  const cy = Math.floor(MAP_HEIGHT / 2);
  for (let dy = -10; dy <= 10; dy++) {
    for (let dx = -10; dx <= 10; dx++) {
      const x = cx + dx;
      const y = cy + dy;
      if (x >= 0 && x < MAP_WIDTH && y >= 0 && y < MAP_HEIGHT) {
        data[y * MAP_WIDTH + x] = 0; // Floor
      }
    }
  }

  return data;
}

/**
 * Evolve an existing map by running one more CA iteration.
 * Used at every 25-level milestone to reshape the world.
 * Clears a safe zone around the given world position so the player isn't stuck.
 */
export function iterateMap(map: TileMap, playerWorldX: number, playerWorldY: number): void {
  const ca = new CellularAutomaton(
    MAP_WIDTH,
    MAP_HEIGHT,
    [5, 6, 7, 8],
    [4, 5, 6, 7, 8],
    false,
  );

  // Load current map into CA
  const data = ca.data;
  data.set(map);

  // Run one step
  ca.step();

  // Copy result back
  const result = ca.data;
  map.set(result);

  // Re-enforce borders
  for (let x = 0; x < MAP_WIDTH; x++) {
    map[x] = 1;
    map[(MAP_HEIGHT - 1) * MAP_WIDTH + x] = 1;
  }
  for (let y = 0; y < MAP_HEIGHT; y++) {
    map[y * MAP_WIDTH] = 1;
    map[y * MAP_WIDTH + MAP_WIDTH - 1] = 1;
  }

  // Clear safe zone around player (10x10 tiles)
  const ptx = Math.floor(playerWorldX / TILE_SIZE);
  const pty = Math.floor(playerWorldY / TILE_SIZE);
  for (let dy = -5; dy <= 5; dy++) {
    for (let dx = -5; dx <= 5; dx++) {
      const x = ptx + dx;
      const y = pty + dy;
      if (x > 0 && x < MAP_WIDTH - 1 && y > 0 && y < MAP_HEIGHT - 1) {
        map[y * MAP_WIDTH + x] = 0;
      }
    }
  }
}

/**
 * Ensure a world position is walkable. If the player is stuck in a wall,
 * carve out the tile they're standing on and its neighbors.
 * Returns the (possibly adjusted) world position.
 */
export function ensureWalkable(map: TileMap, worldX: number, worldY: number): { x: number; y: number } {
  const tx = Math.floor(worldX / TILE_SIZE);
  const ty = Math.floor(worldY / TILE_SIZE);

  if (isWalkable(map, tx, ty)) return { x: worldX, y: worldY };

  // Carve out a 3x3 around the player
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      const x = tx + dx;
      const y = ty + dy;
      if (x > 0 && x < MAP_WIDTH - 1 && y > 0 && y < MAP_HEIGHT - 1) {
        map[y * MAP_WIDTH + x] = 0;
      }
    }
  }

  return { x: worldX, y: worldY };
}

/** Check if a tile position is walkable */
export function isWalkable(map: TileMap, tileX: number, tileY: number): boolean {
  if (tileX < 0 || tileX >= MAP_WIDTH || tileY < 0 || tileY >= MAP_HEIGHT) return false;
  return map[tileY * MAP_WIDTH + tileX] === 0;
}

/** Convert world position to tile coordinates */
export function worldToTile(worldX: number, worldY: number, tileSize: number): { tx: number; ty: number } {
  return {
    tx: Math.floor(worldX / tileSize),
    ty: Math.floor(worldY / tileSize),
  };
}
