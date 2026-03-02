import Phaser from 'phaser';
import { type LevelUpOption, type WeaponDef, type EffectDef, WEAPON_DEFS, EFFECT_DEFS, WeaponType } from '../shared';

export class LevelUpScene extends Phaser.Scene {
  private options: LevelUpOption[] = [];
  private cards: Phaser.GameObjects.Container[] = [];
  private keyHandler: ((e: KeyboardEvent) => void) | null = null;

  constructor() {
    super({ key: 'LevelUp' });
  }

  init(data: { options: LevelUpOption[] }): void {
    this.options = data.options;
  }

  create(): void {
    const width = this.scale.width;
    const height = this.scale.height;

    // Darken background
    this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.7);

    // Title
    this.add.text(width / 2, 40, 'LEVEL UP!', {
      fontSize: '32px',
      fontFamily: 'monospace',
      color: '#ffcc00',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    this.add.text(width / 2, 72, 'Choose an upgrade', {
      fontSize: '16px',
      fontFamily: 'monospace',
      color: '#aaaaaa',
    }).setOrigin(0.5);

    // Create cards
    this.cards = [];
    const cardWidth = 220;
    const cardHeight = 200;
    const spacing = 30;
    const totalWidth = this.options.length * cardWidth + (this.options.length - 1) * spacing;
    const startX = (width - totalWidth) / 2 + cardWidth / 2;

    for (let i = 0; i < this.options.length; i++) {
      const option = this.options[i];
      const cx = startX + i * (cardWidth + spacing);
      const cy = height / 2 + 20;

      const card = this.add.container(cx, cy);

      // Card background
      const bg = this.add.rectangle(0, 0, cardWidth, cardHeight, 0x222244, 0.9)
        .setStrokeStyle(2, 0x4444aa);

      // Color indicator
      let color: number;
      if (option.kind === 'weapon') {
        color = WEAPON_DEFS[option.type as WeaponType].color;
      } else if (option.kind === 'effect') {
        color = EFFECT_DEFS[option.type as number].color;
      } else if (option.kind === 'gold') {
        color = 0xffd700;
      } else {
        color = 0xff6688;
      }
      const indicator = this.add.rectangle(0, -cardHeight / 2 + 15, cardWidth - 20, 6, color);

      // Type badge
      const badgeLabels: Record<string, [string, string]> = {
        weapon: ['WEAPON', '#ff8866'],
        effect: ['PASSIVE', '#66aaff'],
        gold: ['REWARD', '#ffd700'],
        heal: ['REWARD', '#ff6688'],
      };
      const [badgeStr, badgeColor] = badgeLabels[option.kind] ?? ['???', '#888888'];
      const badge = this.add.text(0, -60, badgeStr, {
        fontSize: '10px',
        fontFamily: 'monospace',
        color: badgeColor,
      }).setOrigin(0.5);

      // Name
      const name = this.add.text(0, -35, option.name, {
        fontSize: '18px',
        fontFamily: 'monospace',
        color: '#ffffff',
        fontStyle: 'bold',
      }).setOrigin(0.5);

      // Level
      const isReward = option.kind === 'gold' || option.kind === 'heal';
      const levelStr = isReward ? '' : (option.newLevel === 1 ? 'NEW!' : `Lv ${option.newLevel}`);
      const levelColor = option.newLevel === 1 ? '#00ff88' : '#ffcc00';
      const level = this.add.text(0, -10, levelStr, {
        fontSize: '14px',
        fontFamily: 'monospace',
        color: levelColor,
      }).setOrigin(0.5);

      // Description
      const desc = this.add.text(0, 25, option.description, {
        fontSize: '11px',
        fontFamily: 'monospace',
        color: '#aaaacc',
        wordWrap: { width: cardWidth - 30 },
        align: 'center',
      }).setOrigin(0.5);

      // Key hint label
      const keyHint = this.add.text(0, cardHeight / 2 - 16, `[${i + 1}]`, {
        fontSize: '14px',
        fontFamily: 'monospace',
        color: '#666688',
      }).setOrigin(0.5);

      card.add([bg, indicator, badge, name, level, desc, keyHint]);
      this.cards.push(card);

      // Interactivity
      bg.setInteractive({ useHandCursor: true })
        .on('pointerover', () => {
          bg.setFillStyle(0x333366, 1);
          bg.setStrokeStyle(2, 0x6666ff);
          card.setScale(1.05);
        })
        .on('pointerout', () => {
          bg.setFillStyle(0x222244, 0.9);
          bg.setStrokeStyle(2, 0x4444aa);
          card.setScale(1);
        })
        .on('pointerdown', () => {
          this.selectOption(i);
        });
    }

    // Keyboard shortcuts (1, 2, 3) via native DOM listener
    this.keyHandler = (e: KeyboardEvent) => {
      const num = parseInt(e.key, 10);
      if (num >= 1 && num <= this.options.length) {
        this.selectOption(num - 1);
      }
    };
    window.addEventListener('keydown', this.keyHandler);
  }

  private selectOption(index: number): void {
    this.cleanupKeyHandler();
    const gameScene = this.scene.get('Game');
    gameScene.events.emit('levelup-choice', index);
    this.scene.stop();
  }

  private cleanupKeyHandler(): void {
    if (this.keyHandler) {
      window.removeEventListener('keydown', this.keyHandler);
      this.keyHandler = null;
    }
  }

  shutdown(): void {
    this.cleanupKeyHandler();
  }
}
