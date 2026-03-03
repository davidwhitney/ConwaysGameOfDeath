import type { Player } from '../../../entities/Player';
import { BaseProjectileWeapon, type ActiveProjectile } from '../BaseProjectileWeapon';

export class ScytheWeapon extends BaseProjectileWeapon {
  protected getTexture(): string {
    return 'proj-scythe';
  }

  protected computeAngle(index: number, total: number, _player: Player): number {
    return (index / total) * Math.PI * 2;
  }

  protected moveProjectile(proj: ActiveProjectile, dt: number, player: Player): boolean {
    proj.angle += dt * 4;
    proj.spiralDist += dt * 80;
    proj.x = player.state.x + Math.cos(proj.angle) * proj.spiralDist;
    proj.y = player.state.y + Math.sin(proj.angle) * proj.spiralDist;
    return true;
  }
}
