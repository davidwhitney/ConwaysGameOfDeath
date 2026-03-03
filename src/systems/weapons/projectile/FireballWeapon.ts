import { BaseProjectileWeapon } from '../BaseProjectileWeapon';

export class FireballWeapon extends BaseProjectileWeapon {
  protected getTexture(): string {
    return 'proj-fire';
  }
}
