import Phaser from 'phaser';
import { EffectType, EnemyType } from '../types';
import { PLAYER_SIZE } from '../constants';
import { circlesOverlap } from '../utils/math';
import { InputManager } from './InputManager';
import type { UpdateContext } from './UpdateContext';
import type { GameSystem } from './GameSystem';
import { GameEvents } from './GameEvents';

/** Max enemy effective radius (Dragon 24 × boss 4 = 96) + some margin */
const MAX_ENEMY_RADIUS = 100;

export class PlayerPhysicsSystem implements GameSystem {
  private scene: Phaser.Scene;
  private inputManager: InputManager;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.inputManager = new InputManager(scene);
  }

  update(ctx: UpdateContext): void {
    const { delta: dt, now } = ctx.time;
    const { player, enemyPool } = ctx;

    // Movement & regen
    const movement = this.inputManager.getMovement();
    player.move(movement.x, movement.y, dt, ctx.map);
    player.applyRegen(dt);
    player.updateVisuals(dt);

    // Pause
    if (this.inputManager.isMenuPressed()) {
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
    const slowValue = player.getEffectValue(EffectType.SlowAura);
    if (slowValue > 0) {
      const slowFactor = 1 - slowValue;
      const range = 150 + slowValue * 100;
      const slowNearby = enemyPool.getEnemiesInRadius(px, py, range);
      for (const enemy of slowNearby) {
        enemy.applySlow(slowFactor, 200);
      }
    }
  }

}
