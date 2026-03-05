import type { SeededRandom } from '../shared';

export function randomPositionAtDistance(
  rng: SeededRandom,
  cx: number, cy: number,
  distance: number,
): { x: number; y: number } {
  const angle = rng.next() * Math.PI * 2;
  return {
    x: cx + Math.cos(angle) * distance,
    y: cy + Math.sin(angle) * distance,
  };
}
