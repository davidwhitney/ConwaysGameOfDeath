import type { GameState } from './GameState';

export interface GameSystem {
  update(state: GameState): void;
  destroy?(): void;
}
