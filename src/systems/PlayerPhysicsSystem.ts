import Phaser from 'phaser';
import { EffectType, EnemyType } from '../types';
import { PLAYER_SIZE } from '../constants';
import { circlesOverlap } from '../utils/math';
import { InputSystem } from './InputSystem';
import type { UpdateContext } from './UpdateContext';
import type { GameSystem } from './GameSystem';
import { GameEvents } from './GameEvents';
import { drawEffectCircle } from './weapons/GfxPool';

/** Max enemy effective radius (Dragon 24 × boss 4 = 96) + some margin */
const MAX_ENEMY_RADIUS = 100;

export class PlayerPhysicsSystem implements GameSystem {
  private scene: Phaser.Scene;
  private consumeDeathMask: (() => boolean) | null = null;
  private slowAuraGfx: Phaser.GameObjects.Graphics;

  // Mouse drag state (scene-local — needs camera world position)
  private mouseDown = false;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.slowAuraGfx = scene.add.graphics().setDepth(4);

    scene.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (!pointer.wasTouch) this.mouseDown = true;
    });
    scene.input.on('pointerup', (pointer: Phaser.Input.Pointer) => {
      if (!pointer.wasTouch) this.mouseDown = false;
    });
  }

  setDeathMaskConsumer(fn: () => boolean): void {
    this.consumeDeathMask = fn;
  }

  update(ctx: UpdateContext): void {
    const { delta: dt, now } = ctx.time;
    const { player, enemyPool } = ctx;
    const input = InputSystem.current;

    // Movement — InputMap covers keyboard + gamepad + touch
    let { x: dx, y: dy } = input.move;

    // Mouse drag fallback (camera-dependent, scene-local)
    if (dx === 0 && dy === 0) {
      const m = this.getMouseMovement();
      dx = m.x;
      dy = m.y;
    }

    player.move(dx, dy, dt, ctx.map);
    player.applyRegen(dt);
    player.updateVisuals(dt);

    // Pause
    if (input.menu) {
      GameEvents.pauseGame(this.scene.scene);
    }

    // Enemy collision & thorns — use spatial query instead of scanning all enemies
    const px = player.state.x;
    const py = player.state.y;
    const pr = PLAYER_SIZE / 2;
    const contactRange = pr + MAX_ENEMY_RADIUS;
    const nearby = enemyPool.getEnemiesInRadius(px, py, contactRange);

    for (const enemy of nearby) {
      if (!enemy.state.alive) continue;
      if (circlesOverlap(px, py, pr, enemy.state.x, enemy.state.y, enemy.effectiveSize)) {
        // Death mask: consume a mask to insta-kill Death on contact
        if (enemy.state.type === EnemyType.Death && this.consumeDeathMask?.()) {
          enemy.state.hp = 0;
          GameEvents.emit(this.scene.events, 'enemy-killed', enemy);
          GameEvents.sfx('death-mask-collect');
          GameEvents.emit(this.scene.events, 'screen-shake', 400, 0.02);
          continue;
        }

        const dmg = player.takeDamage(enemy.state.damage, now);
        if (dmg > 0) {
          GameEvents.emit(this.scene.events, 'show-damage', px, py - 20, dmg, '#ff4444');
          GameEvents.emit(this.scene.events, 'screen-shake', 80, 0.003);

          // Death is immune to reflected damage
          if (enemy.state.type !== EnemyType.Death) {
            const thorns = player.getEffectValue(EffectType.Thorns);
            if (thorns > 0) {
              const reflected = Math.floor(dmg * thorns);
              if (reflected > 0) {
                enemy.takeDamage(reflected);
                GameEvents.emit(this.scene.events, 'show-damage', enemy.state.x, enemy.state.y - 15, reflected, '#66aa44');
              }
            }
          }
        }
      }
    }

    // Slow aura
    this.slowAuraGfx.clear();
    const slowValue = player.getEffectValue(EffectType.SlowAura);
    if (slowValue > 0) {
      const slowFactor = 1 - slowValue;
      const range = 150 + slowValue * 100;
      const slowNearby = enemyPool.getEnemiesInRadius(px, py, range);
      for (const enemy of slowNearby) {
        enemy.applySlow(slowFactor, 200);
      }
      drawEffectCircle(this.slowAuraGfx, px, py, range, 0x6688cc, 0.08, 0.25);
    }
  }

  destroy(): void {
    this.slowAuraGfx.destroy();
  }

  private getMouseMovement(): { x: number; y: number } {
    if (!this.mouseDown) return { x: 0, y: 0 };
    const pointer = this.scene.input.activePointer;
    const cam = this.scene.cameras.main;
    const worldX = pointer.x / cam.zoom + cam.worldView.x;
    const worldY = pointer.y / cam.zoom + cam.worldView.y;
    const playerX = cam.worldView.x + cam.worldView.width / 2;
    const playerY = cam.worldView.y + cam.worldView.height / 2;
    let dx = worldX - playerX;
    let dy = worldY - playerY;
    const len = Math.sqrt(dx * dx + dy * dy);
    if (len > 8) {
      dx /= len;
      dy /= len;
    } else {
      dx = 0;
      dy = 0;
    }
    return { x: dx, y: dy };
  }
}
