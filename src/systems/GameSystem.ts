import type { UpdateContext } from './UpdateContext';

export interface GameSystem {
  update(ctx: UpdateContext): void;
  destroy(): void;
}
