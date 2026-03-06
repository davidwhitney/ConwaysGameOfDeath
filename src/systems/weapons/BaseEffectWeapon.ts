import Phaser from 'phaser';
import type { WeaponDef } from '../../types';
import type { Player } from '../../entities/Player';
import { BaseWeapon } from './BaseWeapon';
import type { ActiveEffect } from './ActiveEffect';
import type { WeaponContext } from './WeaponContext';

const MAX_ACTIVE_EFFECTS = 12;

export abstract class BaseEffectWeapon<T extends ActiveEffect> extends BaseWeapon {
  protected effects: T[] = [];
  protected sharedGfx: Phaser.GameObjects.Graphics;

  constructor(ctx: WeaponContext, def: WeaponDef, gfxDepth: number) {
    super(ctx, def);
    this.sharedGfx = ctx.scene.add.graphics();
    this.sharedGfx.setDepth(gfxDepth);
  }

  protected abstract updateEffect(effect: T, dt: number, player: Player): void;

  protected canAddEffect(): boolean {
    return this.effects.length < MAX_ACTIVE_EFFECTS;
  }

  protected updateActive(dt: number, player: Player): void {
    this.sharedGfx.clear();

    const view = this.ctx.scene.cameras.main.worldView;
    const pad = 100; // margin so effects don't pop in/out at edges

    for (let i = this.effects.length - 1; i >= 0; i--) {
      const e = this.effects[i];
      e.age += dt * 1000;

      if (e.age >= e.duration) {
        this.effects.splice(i, 1);
        continue;
      }

      // Skip drawing off-screen effects (still age them so they expire)
      if (e.x < view.x - pad || e.x > view.right + pad ||
          e.y < view.y - pad || e.y > view.bottom + pad) continue;

      this.updateEffect(e, dt, player);
    }
  }

  destroy(): void {
    this.effects.length = 0;
    this.sharedGfx.destroy();
  }
}
