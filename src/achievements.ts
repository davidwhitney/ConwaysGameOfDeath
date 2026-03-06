import type { UpdateContext } from './systems/UpdateContext';

export interface AchievementDef {
  id: string;
  name: string;
  description: string;
  evaluate?: (ctx: UpdateContext) => boolean;
}

export const ACHIEVEMENTS: AchievementDef[] = [
  { id: 'killed-death', name: 'Killed Death', description: 'Destroy Death using a Death Mask' },
];
