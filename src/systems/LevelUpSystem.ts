import Phaser from 'phaser';
import { EffectType, type LevelUpOption } from '../types';
import {
  MAX_LEVEL, GOLD_REROLL_BASE_COST, GOLD_REROLL_COST_MULTIPLIER,
  LEVELUP_LUCK_BASE_HEAL_PCT, LEVELUP_LUCK_HEAL_SCALING,
} from '../constants';
import { SeededRandom } from '../utils/seeded-random';
import { xpForLevel, generateLevelUpOptions, generatePostMaxOptions, applyLevelUpChoice } from './leveling';
import type { GameState } from './GameState';
import type { GameSystem } from './GameSystem';
import { GameEvents } from './GameEvents';

export class LevelUpSystem implements GameSystem {
  private scene: Phaser.Scene;
  private state: GameState;
  private rng: SeededRandom;

  private pendingLevelUps: number = 0;
  private rerollCount: number = 0;
  private currentLevelUpOptions: LevelUpOption[] = [];

  constructor(scene: Phaser.Scene, rng: SeededRandom, state: GameState) {
    this.scene = scene;
    this.state = state;
    this.rng = rng;

    GameEvents.on(this.scene.events, 'levelup-option-selected', (index) => this.handleLevelUpChoice(index));
    GameEvents.on(this.scene.events, 'levelup-rerolled', () => this.handleReroll());
    GameEvents.on(this.scene.events, 'levelup-skipped', () => this.handleLevelUpSkip());
  }

  public update(_state: GameState): void {
    const player = this.state.player;
    const hadPending = this.pendingLevelUps > 0;

    while (player.state.xp >= player.state.xpToNext) {
      this.pendingLevelUps++;
      player.state.xp -= player.state.xpToNext;
      player.state.level++;
      player.state.xpToNext = xpForLevel(player.state.level + 1);
      GameEvents.sfx('level-up');
      GameEvents.highlight('level-up');

      // Luck-based heal on level up
      const luckVal = player.getEffectValue(EffectType.Luck);
      if (luckVal > 0 && Math.random() < luckVal) {
        const healPct = LEVELUP_LUCK_BASE_HEAL_PCT + luckVal * LEVELUP_LUCK_HEAL_SCALING;
        const healAmt = Math.floor(player.state.maxHp * healPct);
        player.state.hp = Math.min(player.state.maxHp, player.state.hp + healAmt);
        GameEvents.emit(this.scene.events, 'damage-dealt', player.state.x, player.state.y - 30, healAmt, '#ff4444');
      }
    }

    if (!hadPending && this.pendingLevelUps > 0 && !this.scene.scene.isActive('LevelUp')) {
      this.processLevelUp();
    }
  }

  processLevelUp(): void {
    if (this.pendingLevelUps <= 0) return;
    this.pendingLevelUps--;

    const options = this.generateOptions();
    if (options.length === 0) {
      this.closeLevelUp();
      return;
    }

    this.currentLevelUpOptions = options;

    this.scene.scene.pause();
    const data = {
      options,
      gold: this.state.player.state.gold,
      rerollCost: this.rerollCost,
    };
    if (this.scene.scene.isActive('LevelUp')) {
      const levelUp = this.scene.scene.get('LevelUp');
      levelUp.scene.restart(data);
    } else {
      this.scene.scene.launch('LevelUp', data);
    }
  }

  get rerollCost(): number {
    return Math.floor(GOLD_REROLL_BASE_COST * Math.pow(GOLD_REROLL_COST_MULTIPLIER, this.rerollCount));
  }

  reset(): void {
    this.pendingLevelUps = 0;
    this.rerollCount = 0;
    this.currentLevelUpOptions = [];
  }

  destroy(): void {
    GameEvents.off(this.scene.events, 'levelup-option-selected');
    GameEvents.off(this.scene.events, 'levelup-rerolled');
    GameEvents.off(this.scene.events, 'levelup-skipped');
  }

  private handleLevelUpChoice(index: number): void {
    const player = this.state.player;
    const options = this.currentLevelUpOptions;
    if (!options || index >= options.length) return;

    const choice = options[index];
    applyLevelUpChoice(player.state, choice);
    player.invalidateEffectCache();
    GameEvents.sfx('ability-select');


    if (this.pendingLevelUps > 0) {
      this.processLevelUp();
    } else {
      this.closeLevelUp();
    }
  }

  private handleLevelUpSkip(): void {
    if (this.pendingLevelUps > 0) {
      this.processLevelUp();
    } else {
      this.closeLevelUp();
    }
  }

  private closeLevelUp(): void {
    this.scene.scene.stop('LevelUp');
    this.scene.scene.resume();
  }

  private handleReroll(): void {
    const player = this.state.player;
    const cost = this.rerollCost;
    if (player.state.gold < cost) return;
    player.state.gold -= cost;
    this.rerollCount++;
    GameEvents.sfx('reroll');

    const options = this.generateOptions();
    if (options.length === 0) return;
    this.currentLevelUpOptions = options;

    const levelUp = this.scene.scene.get('LevelUp');
    levelUp.scene.restart({
      options,
      gold: player.state.gold,
      rerollCost: this.rerollCost,
    });
  }

  private generateOptions(): LevelUpOption[] {
    const player = this.state.player;
    if (player.state.level > MAX_LEVEL) {
      return generatePostMaxOptions(player.state.level);
    }
    return generateLevelUpOptions(
      player.state.weapons,
      player.state.effects,
      () => this.rng.next(),
    );
  }
}
