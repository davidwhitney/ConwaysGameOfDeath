import type { WeaponDef } from '../../shared';
import type { Player } from '../../entities/Player';
import { BaseWeapon } from './BaseWeapon';
import { GfxPool } from './GfxPool';
import type { ActiveEffect } from './ActiveEffect';
import type { WeaponContext } from './WeaponContext';

export abstract class BaseEffectWeapon<T extends ActiveEffect> extends BaseWeapon {
  protected effects: T[] = [];
  protected pool: GfxPool;

  constructor(ctx: WeaponContext, def: WeaponDef, poolDepth: number) {
    super(ctx, def);
    this.pool = new GfxPool(ctx.scene, poolDepth);
  }

  protected abstract updateEffect(effect: T, dt: number, player: Player): void;

  protected updateActive(dt: number, player: Player): void {
    for (let i = this.effects.length - 1; i >= 0; i--) {
      const e = this.effects[i];
      e.age += dt * 1000;

      if (e.age >= e.duration) {
        this.pool.release(e.gfx);
        this.effects.splice(i, 1);
        continue;
      }

      this.updateEffect(e, dt, player);
    }
  }

  destroy(): void {
    for (const e of this.effects) e.gfx.destroy();
    this.effects.length = 0;
    this.pool.destroy();
  }
}
