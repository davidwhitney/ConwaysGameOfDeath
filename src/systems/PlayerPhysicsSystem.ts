import Phaser from 'phaser';
import { PLAYER_SIZE, circlesOverlap, EffectType } from '../shared';
import type { Player } from '../entities/Player';
import type { InputManager } from './InputManager';
import type { EnemyPool } from './EnemyPool';
import type { CameraManager } from './CameraManager';

export interface PlayerPhysicsDeps {
  scene: Phaser.Scene;
  player: Player;
  inputManager: InputManager;
  enemyPool: EnemyPool;
  cameraManager: CameraManager;
}

export class PlayerPhysicsSystem {
  private scene: Phaser.Scene;
  private player: Player;
  private inputManager: InputManager;
  private enemyPool: EnemyPool;
  private cameraManager: CameraManager;

  constructor(deps: PlayerPhysicsDeps) {
    this.scene = deps.scene;
    this.player = deps.player;
    this.inputManager = deps.inputManager;
    this.enemyPool = deps.enemyPool;
    this.cameraManager = deps.cameraManager;
  }

  update(dt: number, now: number): void {
    // Movement & regen
    const movement = this.inputManager.getMovement();
    this.player.move(movement.x, movement.y, dt);
    this.player.applyRegen(dt);
    this.player.updateVisuals();

    // Pause
    if (this.inputManager.isMenuPressed()) {
      this.scene.scene.pause();
      this.scene.scene.launch('Pause');
    }

    // Enemy collision & thorns
    const enemies = this.enemyPool.getActive();
    const px = this.player.state.x;
    const py = this.player.state.y;
    const pr = PLAYER_SIZE / 2;

    for (const enemy of enemies) {
      if (!enemy.state.alive) continue;
      if (circlesOverlap(px, py, pr, enemy.state.x, enemy.state.y, enemy.effectiveSize)) {
        const dmg = this.player.takeDamage(enemy.state.damage, now);
        if (dmg > 0) {
          this.scene.events.emit('show-damage', px, py - 20, dmg, '#ff4444');
          this.cameraManager.shake(80, 0.003);

          const thorns = this.player.getEffectValue(EffectType.Thorns);
          if (thorns > 0) {
            const reflected = Math.floor(dmg * thorns);
            if (reflected > 0) {
              enemy.takeDamage(reflected);
              this.scene.events.emit('show-damage', enemy.state.x, enemy.state.y - 15, reflected, '#66aa44');
            }
          }
        }
      }
    }

    // Slow aura
    const slowValue = this.player.getEffectValue(EffectType.SlowAura);
    if (slowValue > 0) {
      const slowFactor = 1 - slowValue;
      const range = 150 + slowValue * 100;
      const nearby = this.enemyPool.getEnemiesInRadius(px, py, range);
      for (const enemy of nearby) {
        enemy.applySlow(slowFactor, 200);
      }
    }
  }

  destroy(): void {
    // No listeners to clean up
  }
}
