import type { WeaponInstance } from '../../../types';
import type { Player } from '../../../entities/Player';
import type { Enemy } from '../../../entities/Enemy';
import { BaseForceFieldWeapon } from '../BaseForceFieldWeapon';

/**
 * Frost Aura — Progressive freeze.
 * Enemies slow down more the longer they stay in the aura.
 * Starts at 70% speed, ramps down to full freeze (0%) over 2 seconds.
 * Visual frost tint intensifies as freeze builds.
 */
export class FrostAuraWeapon extends BaseForceFieldWeapon {
  private freezeMap = new Map<number, number>();

  protected override onFrameHit(enemy: Enemy, _stats: ReturnType<FrostAuraWeapon['getStats']>, dt: number, _player: Player): void {
    // Accumulate freeze time for this enemy
    const id = enemy.state.id;
    const prev = this.freezeMap.get(id) ?? 0;
    const freezeTime = Math.min(prev + dt, 2.0);
    this.freezeMap.set(id, freezeTime);

    // Progressive slow: 0.7 at start → 0.0 at 2s
    const freezeProgress = freezeTime / 2.0;
    const slowFactor = Math.max(0, 0.7 - 0.7 * freezeProgress);
    const slowDuration = 300 + Math.floor(freezeProgress * 700);
    enemy.applySlow(slowFactor, slowDuration);
  }

  protected override onTickHit(enemy: Enemy): void {
    // No additional tick effect — freeze + damage is enough
  }

  override update(dt: number, player: Player, weapon: WeaponInstance): void {
    // Decay freeze for enemies that left the aura
    for (const [id, time] of this.freezeMap) {
      if (time > 0) {
        const decayed = time - dt * 1.5;
        if (decayed <= 0) {
          this.freezeMap.delete(id);
        } else {
          this.freezeMap.set(id, decayed);
        }
      }
    }
    super.update(dt, player, weapon);
  }
}
