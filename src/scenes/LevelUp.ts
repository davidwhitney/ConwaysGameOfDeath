import Phaser from 'phaser';
import { type LevelUpOption, WEAPON_DEFS, EFFECT_DEFS, WeaponType } from '../shared';

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
    const n = this.options.length;

    // Darken background
    this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.7);

    // Determine layout: horizontal if cards fit, vertical if narrow
    const baseCardW = 220;
    const baseCardH = 200;
    const spacing = 20;
    const horizontalNeeded = n * baseCardW + (n - 1) * spacing + 40;
    const isNarrow = width < horizontalNeeded;

    // Scale cards to fit available space
    let cardW: number, cardH: number, scale: number;
    if (isNarrow) {
      // Vertical layout — fit cards to width, distribute available height
      scale = Math.min(1, (width - 40) / baseCardW);
      cardW = baseCardW * scale;
      const availH = height - 120; // reserve space for title
      cardH = Math.min(baseCardH * scale, (availH - (n - 1) * spacing) / n);
      scale = Math.min(scale, cardH / baseCardH);
    } else {
      scale = 1;
      cardW = baseCardW;
      cardH = baseCardH;
    }

    // Title
    const titleSize = Math.max(16, Math.floor(32 * Math.min(1, width / 500)));
    const subtitleSize = Math.max(10, Math.floor(16 * Math.min(1, width / 500)));

    this.add.text(width / 2, 20 * scale + 10, 'LEVEL UP!', {
      fontSize: `${titleSize}px`,
      fontFamily: 'monospace',
      color: '#ffcc00',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    this.add.text(width / 2, 20 * scale + titleSize + 16, 'Choose an upgrade', {
      fontSize: `${subtitleSize}px`,
      fontFamily: 'monospace',
      color: '#aaaaaa',
    }).setOrigin(0.5);

    const titleAreaH = 20 * scale + titleSize + subtitleSize + 30;

    // Create cards
    this.cards = [];
    for (let i = 0; i < n; i++) {
      let cx: number, cy: number;
      if (isNarrow) {
        const totalH = n * cardH + (n - 1) * spacing;
        const startY = titleAreaH + (height - titleAreaH - totalH) / 2 + cardH / 2;
        cx = width / 2;
        cy = startY + i * (cardH + spacing);
      } else {
        const totalW = n * cardW + (n - 1) * spacing;
        const startX = (width - totalW) / 2 + cardW / 2;
        cx = startX + i * (cardW + spacing);
        cy = titleAreaH + (height - titleAreaH) / 2;
      }

      this.createCard(i, cx, cy, cardW, cardH, scale);
    }

    // Keyboard shortcuts via native DOM listener
    this.keyHandler = (e: KeyboardEvent) => {
      const num = parseInt(e.key, 10);
      if (num >= 1 && num <= this.options.length) {
        this.selectOption(num - 1);
      }
    };
    window.addEventListener('keydown', this.keyHandler);
  }

  private createCard(i: number, cx: number, cy: number, cardW: number, cardH: number, scale: number): void {
    const option = this.options[i];
    const card = this.add.container(cx, cy);

    const bg = this.add.rectangle(0, 0, cardW, cardH, 0x222244, 0.9)
      .setStrokeStyle(2, 0x4444aa);

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
    const indicator = this.add.rectangle(0, -cardH / 2 + 15 * scale, cardW - 20 * scale, 6 * scale, color);

    const badgeLabels: Record<string, [string, string]> = {
      weapon: ['WEAPON', '#ff8866'],
      effect: ['PASSIVE', '#66aaff'],
      gold: ['REWARD', '#ffd700'],
      heal: ['REWARD', '#ff6688'],
    };
    const [badgeStr, badgeColor] = badgeLabels[option.kind] ?? ['???', '#888888'];
    const badge = this.add.text(0, -cardH / 2 + 26 * scale, badgeStr, {
      fontSize: `${Math.max(8, Math.round(10 * scale))}px`,
      fontFamily: 'monospace',
      color: badgeColor,
    }).setOrigin(0.5);

    const name = this.add.text(0, -cardH / 2 + 42 * scale, option.name, {
      fontSize: `${Math.max(12, Math.round(18 * scale))}px`,
      fontFamily: 'monospace',
      color: '#ffffff',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    const isReward = option.kind === 'gold' || option.kind === 'heal';
    const levelStr = isReward ? '' : (option.newLevel === 1 ? 'NEW!' : `Lv ${option.newLevel}`);
    const levelColor = option.newLevel === 1 ? '#00ff88' : '#ffcc00';
    const level = this.add.text(0, -cardH / 2 + 60 * scale, levelStr, {
      fontSize: `${Math.max(10, Math.round(14 * scale))}px`,
      fontFamily: 'monospace',
      color: levelColor,
    }).setOrigin(0.5);

    const desc = this.add.text(0, 5 * scale, option.description, {
      fontSize: `${Math.max(8, Math.round(11 * scale))}px`,
      fontFamily: 'monospace',
      color: '#aaaacc',
      wordWrap: { width: cardW - 20 },
      align: 'center',
    }).setOrigin(0.5);

    const keyHint = this.add.text(0, cardH / 2 - 14 * scale, `[${i + 1}]`, {
      fontSize: `${Math.max(10, Math.round(14 * scale))}px`,
      fontFamily: 'monospace',
      color: '#666688',
    }).setOrigin(0.5);

    card.add([bg, indicator, badge, name, level, desc, keyHint]);
    this.cards.push(card);

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
