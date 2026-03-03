import Phaser from 'phaser';
import {
  SeededRandom, xpForLevel, generateLevelUpOptions, generatePostMaxOptions,
  applyLevelUpChoice, MAX_LEVEL, EffectType,
  GOLD_REROLL_BASE_COST, GOLD_REROLL_COST_MULTIPLIER,
  type LevelUpOption,
} from '../shared';
import {
  LEVELUP_LUCK_BASE_HEAL_PCT, LEVELUP_LUCK_HEAL_SCALING,
} from '../shared/constants';
import type { Player } from '../entities/Player';

export interface LevelUpDeps {
  scene: Phaser.Scene;
  player: Player;
  rng: SeededRandom;
}

export class LevelUpSystem {
  private scene: Phaser.Scene;
  private player: Player;
  private rng: SeededRandom;

  private pendingLevelUps: number = 0;
  private rerollCount: number = 0;
  private currentLevelUpOptions: LevelUpOption[] = [];

  constructor(deps: LevelUpDeps) {
    this.scene = deps.scene;
    this.player = deps.player;
    this.rng = deps.rng;

    this.scene.events.on('levelup-choice', (index: number) => this.handleLevelUpChoice(index));
    this.scene.events.on('levelup-reroll', () => this.handleReroll());
    this.scene.events.on('levelup-skip', () => this.handleLevelUpSkip());
  }

  accumulateLevelUps(): void {
    while (this.player.state.xp >= this.player.state.xpToNext) {
      this.pendingLevelUps++;
      this.player.state.xp -= this.player.state.xpToNext;
      this.player.state.level++;
      this.player.state.xpToNext = xpForLevel(this.player.state.level + 1);

      // Luck-based heal on level up
      const luckVal = this.player.getEffectValue(EffectType.Luck);
      if (luckVal > 0 && Math.random() < luckVal) {
        const healPct = LEVELUP_LUCK_BASE_HEAL_PCT + luckVal * LEVELUP_LUCK_HEAL_SCALING;
        const healAmt = Math.floor(this.player.state.maxHp * healPct);
        this.player.state.hp = Math.min(this.player.state.maxHp, this.player.state.hp + healAmt);
        this.scene.events.emit('show-damage', this.player.state.x, this.player.state.y - 30, healAmt, '#ff4444');
      }
    }
  }

  processLevelUp(): void {
    if (this.pendingLevelUps <= 0) return;
    this.pendingLevelUps--;

    const options = this.generateOptions();
    if (options.length === 0) return;

    this.currentLevelUpOptions = options;

    this.scene.scene.pause();
    this.scene.scene.launch('LevelUp', {
      options,
      gold: this.player.state.gold,
      rerollCost: this.getRerollCost(),
    });
  }

  hasPendingLevelUp(): boolean {
    return this.pendingLevelUps > 0;
  }

  getRerollCost(): number {
    return Math.floor(GOLD_REROLL_BASE_COST * Math.pow(GOLD_REROLL_COST_MULTIPLIER, this.rerollCount));
  }

  reset(): void {
    this.pendingLevelUps = 0;
    this.rerollCount = 0;
    this.currentLevelUpOptions = [];
  }

  destroy(): void {
    this.scene.events.off('levelup-choice');
    this.scene.events.off('levelup-reroll');
    this.scene.events.off('levelup-skip');
  }

  private handleLevelUpChoice(index: number): void {
    const options = this.currentLevelUpOptions;
    if (!options || index >= options.length) return;

    applyLevelUpChoice(this.player.state, options[index]);

    if (this.pendingLevelUps > 0) {
      this.processLevelUp();
    } else {
      this.scene.scene.resume();
    }
  }

  private handleLevelUpSkip(): void {
    if (this.pendingLevelUps > 0) {
      this.processLevelUp();
    } else {
      this.scene.scene.resume();
    }
  }

  private handleReroll(): void {
    const cost = this.getRerollCost();
    if (this.player.state.gold < cost) return;
    this.player.state.gold -= cost;
    this.rerollCount++;

    const options = this.generateOptions();
    if (options.length === 0) return;
    this.currentLevelUpOptions = options;

    const levelUp = this.scene.scene.get('LevelUp');
    levelUp.scene.restart({
      options,
      gold: this.player.state.gold,
      rerollCost: this.getRerollCost(),
    });
  }

  private generateOptions(): LevelUpOption[] {
    if (this.player.state.level > MAX_LEVEL) {
      return generatePostMaxOptions(this.player.state.level);
    }
    return generateLevelUpOptions(
      this.player.state.weapons,
      this.player.state.effects,
      () => this.rng.next(),
    );
  }
}
