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
import type { UpdateContext } from '../systems/UpdateContext';
import type { GameSystem } from '../systems/GameSystem';
import { GameEvents } from '../systems/GameEvents';

export class LevelUpSystem implements GameSystem {
  private scene: Phaser.Scene;
  private player: Player;
  private rng: SeededRandom;

  private pendingLevelUps: number = 0;
  private rerollCount: number = 0;
  private currentLevelUpOptions: LevelUpOption[] = [];

  constructor(scene: Phaser.Scene, rng: SeededRandom, player: Player) {
    this.scene = scene;
    this.player = player;
    this.rng = rng;

    GameEvents.on(this.scene.events, 'levelup-choice', (index) => this.handleLevelUpChoice(index));
    GameEvents.on(this.scene.events, 'levelup-reroll', () => this.handleReroll());
    GameEvents.on(this.scene.events, 'levelup-skip', () => this.handleLevelUpSkip());
  }

  public update(_ctx: UpdateContext): void {
    const hadPending = this.pendingLevelUps > 0;

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
        GameEvents.emit(this.scene.events, 'show-damage', this.player.state.x, this.player.state.y - 30, healAmt, '#ff4444');
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
      gold: this.player.state.gold,
      rerollCost: this.getRerollCost(),
    };
    if (this.scene.scene.isActive('LevelUp')) {
      const levelUp = this.scene.scene.get('LevelUp');
      levelUp.scene.restart(data);
    } else {
      this.scene.scene.launch('LevelUp', data);
    }
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
    GameEvents.off(this.scene.events, 'levelup-choice');
    GameEvents.off(this.scene.events, 'levelup-reroll');
    GameEvents.off(this.scene.events, 'levelup-skip');
  }

  private handleLevelUpChoice(index: number): void {
    const options = this.currentLevelUpOptions;
    if (!options || index >= options.length) return;

    const choice = options[index];
    applyLevelUpChoice(this.player.state, choice);
    this.player.invalidateEffectCache();

    if (choice.kind === 'weapon' && choice.newLevel === 5) {
      document.dispatchEvent(new CustomEvent('game-highlight', { detail: 'weapon-max' }));
    }

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
