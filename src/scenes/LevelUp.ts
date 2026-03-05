import Phaser from 'phaser';
import { type LevelUpOption, WEAPON_DEFS, EFFECT_DEFS, WeaponType } from '../shared';
import { GamepadNav } from '../ui/gamepadNav';
import { GameEvents } from '../systems/GameEvents';
import { onResizeRestart } from '../ui/resizeHandler';

const CARD_SELECTED = { fill: 0x333366, alpha: 1, stroke: 0x6666ff, scale: 1.05 } as const;
const CARD_DEFAULT = { fill: 0x222244, alpha: 0.9, stroke: 0x4444aa, scale: 1 } as const;

interface CardLayout {
  cardW: number;
  cardH: number;
  scale: number;
  titleAreaH: number;
  isNarrow: boolean;
}

export class LevelUpScene extends Phaser.Scene {
  private options: LevelUpOption[] = [];
  private cards: Phaser.GameObjects.Container[] = [];
  private cardBgs: Phaser.GameObjects.Rectangle[] = [];
  private keyHandler: ((e: KeyboardEvent) => void) | null = null;
  private gpNav!: GamepadNav;
  private isNarrow = false;
  private kbSelected = 0;
  private gold = 0;
  private rerollCost = 0;
  private prevY = false;
  private initData: { options: LevelUpOption[]; gold?: number; rerollCost?: number } = { options: [] };

  constructor() {
    super({ key: 'LevelUp' });
  }

  init(data: { options: LevelUpOption[]; gold?: number; rerollCost?: number }): void {
    this.initData = data;
    this.options = data.options;
    this.gold = data.gold ?? 0;
    this.rerollCost = data.rerollCost ?? 10;
  }

  create(): void {
    const width = this.scale.width;
    const height = this.scale.height;

    this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.7);

    const layout = this.computeLayout(width, height);
    this.isNarrow = layout.isNarrow;

    const cardsBottomY = this.createCards(width, height, layout);
    this.createRerollSection(width, cardsBottomY);
    this.setupInput(layout);

    onResizeRestart(this, this.initData);
    this.events.once('shutdown', () => this.shutdown());
  }

  private computeLayout(width: number, height: number): CardLayout {
    const n = this.options.length;
    const rerollAreaH = 55;
    const baseCardW = 220;
    const baseCardH = 200;
    const spacing = 20;
    const horizontalNeeded = n * baseCardW + (n - 1) * spacing + 40;
    const isNarrow = width < horizontalNeeded;

    let cardW: number, cardH: number, scale: number;
    if (isNarrow) {
      scale = Math.min(1, (width - 40) / baseCardW);
      cardW = baseCardW * scale;
      const availH = height - 120 - rerollAreaH;
      cardH = Math.min(baseCardH * scale, (availH - (n - 1) * spacing) / n);
      scale = Math.min(scale, cardH / baseCardH);
    } else {
      scale = 1;
      cardW = baseCardW;
      cardH = baseCardH;
    }

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

    return { cardW, cardH, scale, titleAreaH, isNarrow };
  }

  private createCards(width: number, height: number, layout: CardLayout): number {
    const { cardW, cardH, scale, titleAreaH, isNarrow } = layout;
    const n = this.options.length;
    const spacing = 20;
    const rerollAreaH = 55;

    this.cards = [];
    this.cardBgs = [];
    let cardsBottomY = 0;

    for (let i = 0; i < n; i++) {
      let cx: number, cy: number;
      if (isNarrow) {
        const totalH = n * cardH + (n - 1) * spacing;
        const startY = titleAreaH + (height - titleAreaH - rerollAreaH - totalH) / 2 + cardH / 2;
        cx = width / 2;
        cy = startY + i * (cardH + spacing);
      } else {
        const totalW = n * cardW + (n - 1) * spacing;
        const startX = (width - totalW) / 2 + cardW / 2;
        cx = startX + i * (cardW + spacing);
        cy = titleAreaH + (height - titleAreaH - rerollAreaH) / 2;
      }

      this.createCard(i, cx, cy, cardW, cardH, scale);
      cardsBottomY = Math.max(cardsBottomY, cy + cardH / 2);
    }

    return cardsBottomY;
  }

  private createRerollSection(width: number, cardsBottomY: number): void {
    const goldY = cardsBottomY + 14;
    const rerollBtnY = cardsBottomY + 36;

    this.add.text(width / 2, goldY, `Gold: ${this.gold}`, {
      fontSize: '11px',
      fontFamily: 'monospace',
      color: '#ffd700',
    }).setOrigin(0.5);

    const canAfford = this.gold >= this.rerollCost;
    const btnColor = canAfford ? 0x334433 : 0x222222;
    const textColor = canAfford ? '#88cc88' : '#666666';
    const btnW = Math.min(160, (width - 60) / 2);
    const btnGap = 12;

    // Reroll button (left)
    const rerollX = width / 2 - btnW / 2 - btnGap / 2;
    const rerollBtn = this.add.rectangle(rerollX, rerollBtnY, btnW, 28, btnColor)
      .setStrokeStyle(1, canAfford ? 0x558855 : 0x444444);
    this.add.text(rerollX, rerollBtnY, `Re-roll [R/Y] - ${this.rerollCost}g`, {
      fontSize: '12px',
      fontFamily: 'monospace',
      color: textColor,
    }).setOrigin(0.5);
    if (canAfford) {
      rerollBtn.setInteractive({ useHandCursor: true })
        .on('pointerover', () => rerollBtn.setFillStyle(0x446644))
        .on('pointerout', () => rerollBtn.setFillStyle(0x334433))
        .on('pointerdown', () => this.reroll());
    }

    // Skip button (right)
    const skipX = width / 2 + btnW / 2 + btnGap / 2;
    const skipBtn = this.add.rectangle(skipX, rerollBtnY, btnW, 28, 0x332222)
      .setStrokeStyle(1, 0x554444);
    this.add.text(skipX, rerollBtnY, 'Skip [E/B]', {
      fontSize: '12px',
      fontFamily: 'monospace',
      color: '#cc8888',
    }).setOrigin(0.5);
    skipBtn.setInteractive({ useHandCursor: true })
      .on('pointerover', () => skipBtn.setFillStyle(0x443333))
      .on('pointerout', () => skipBtn.setFillStyle(0x332222))
      .on('pointerdown', () => this.skip());
  }

  private setupInput(layout: CardLayout): void {
    const n = this.options.length;

    this.kbSelected = 0;
    this.keyHandler = (e: KeyboardEvent) => {
      const num = parseInt(e.key, 10);
      if (num >= 1 && num <= n) {
        this.selectOption(num - 1);
        return;
      }
      const key = e.key.toLowerCase();
      if (key === 'a' || key === 'arrowleft' || key === 'w' || key === 'arrowup') {
        this.kbSelected = (this.kbSelected - 1 + n) % n;
      } else if (key === 'd' || key === 'arrowright' || key === 's' || key === 'arrowdown') {
        this.kbSelected = (this.kbSelected + 1) % n;
      } else if (key === ' ' || key === 'enter') {
        this.selectOption(this.kbSelected);
      } else if (key === 'r') {
        if (this.gold >= this.rerollCost) this.reroll();
      } else if (key === 'e') {
        this.skip();
      }
    };
    window.addEventListener('keydown', this.keyHandler);

    const direction = layout.isNarrow ? 'vertical' as const : 'horizontal' as const;
    this.gpNav = new GamepadNav(this, n, (i) => this.selectOption(i), () => this.skip(), direction);
  }

  update(_time: number): void {
    this.gpNav.update(_time);

    // Gamepad Y button for reroll
    const pad = this.input.gamepad?.pad1;
    const yPressed = pad?.buttons[3]?.pressed ?? false;
    if (yPressed && !this.prevY && this.gold >= this.rerollCost) {
      this.reroll();
    }
    this.prevY = yPressed;

    const gpSel = this.gpNav.getSelected();
    const sel = pad ? gpSel : this.kbSelected;
    for (let i = 0; i < this.cardBgs.length; i++) {
      this.applyCardStyle(i, i === sel);
    }
  }

  private createCard(i: number, cx: number, cy: number, cardW: number, cardH: number, scale: number): void {
    const option = this.options[i];
    const card = this.add.container(cx, cy);

    const bg = this.add.rectangle(0, 0, cardW, cardH, CARD_DEFAULT.fill, CARD_DEFAULT.alpha)
      .setStrokeStyle(2, CARD_DEFAULT.stroke);

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
    this.cardBgs.push(bg);

    bg.setInteractive({ useHandCursor: true })
      .on('pointerover', () => this.applyCardStyle(i, true))
      .on('pointerout', () => this.applyCardStyle(i, false))
      .on('pointerdown', () => this.selectOption(i));
  }

  private applyCardStyle(index: number, selected: boolean): void {
    const style = selected ? CARD_SELECTED : CARD_DEFAULT;
    this.cardBgs[index].setFillStyle(style.fill, style.alpha);
    this.cardBgs[index].setStrokeStyle(2, style.stroke);
    this.cards[index].setScale(style.scale);
  }

  private skip(): void {
    this.cleanupKeyHandler();
    const gameScene = this.scene.get('Game');
    GameEvents.emit(gameScene.events, 'levelup-skip');
  }

  private reroll(): void {
    this.cleanupKeyHandler();
    const gameScene = this.scene.get('Game');
    GameEvents.emit(gameScene.events, 'levelup-reroll');
  }

  private selectOption(index: number): void {
    this.cleanupKeyHandler();
    const gameScene = this.scene.get('Game');
    GameEvents.emit(gameScene.events, 'levelup-choice', index);
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
