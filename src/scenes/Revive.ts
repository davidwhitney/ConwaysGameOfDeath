import Phaser from 'phaser';
import { applyUIZoom } from '../ui/uiScale';
import { GamepadNav } from '../ui/gamepadNav';
import { createButton } from '../ui/buttonFactory';
import { monoStyle } from '../ui/textStyles';
import { GameEvents } from '../systems/GameEvents';

export class ReviveScene extends Phaser.Scene {
  private gpNav!: GamepadNav;
  private buttons: Phaser.GameObjects.Rectangle[] = [];
  private defaultFills: number[] = [];
  private hoverFills: number[] = [];
  private keyHandler: ((e: KeyboardEvent) => void) | null = null;
  private kbSelected = 0;
  private gold = 0;
  private cost = 0;

  constructor() {
    super({ key: 'Revive' });
  }

  init(data: { gold: number; cost: number }): void {
    this.gold = data.gold;
    this.cost = data.cost;
  }

  create(): void {
    this.scene.bringToTop();
    const { width, height } = applyUIZoom(this);
    const canAfford = this.gold >= this.cost;

    // Dark overlay
    this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.75);

    // Title
    this.add.text(width / 2, height * 0.22, 'YOU DIED',
      monoStyle('48px', '#ff4444', { fontStyle: 'bold' }),
    ).setOrigin(0.5);

    // Gold display
    this.add.text(width / 2, height * 0.35, `Gold: ${this.gold}`,
      monoStyle('18px', '#ffd700'),
    ).setOrigin(0.5);

    // Cost display
    const costColor = canAfford ? '#88cc88' : '#ff6666';
    this.add.text(width / 2, height * 0.42, `Revive cost: ${this.cost}g`,
      monoStyle('14px', costColor),
    ).setOrigin(0.5);

    // Buttons
    this.buttons = [];
    this.defaultFills = [];
    this.hoverFills = [];
    let btnCount = 0;

    if (canAfford) {
      const revive = createButton(this, {
        x: width / 2, y: height * 0.55, width: 220, height: 45,
        label: 'REVIVE [Enter]', fontSize: '20px', textColor: '#ffffff',
        fillColor: 0x336633, hoverColor: 0x448844,
        onClick: () => this.accept(),
      });
      this.buttons.push(revive.bg);
      this.defaultFills.push(0x336633);
      this.hoverFills.push(0x448844);
      revive.bg.off('pointerout').on('pointerout', () => this.unhighlightBtn(0));
      btnCount++;
    }

    const giveUp = createButton(this, {
      x: width / 2, y: height * (canAfford ? 0.67 : 0.55), width: 220, height: 45,
      label: 'GIVE UP [Esc]', fontSize: '20px', textColor: '#ff8888',
      fillColor: 0x443333, hoverColor: 0x664444,
      onClick: () => this.decline(),
    });
    this.buttons.push(giveUp.bg);
    this.defaultFills.push(0x443333);
    this.hoverFills.push(0x664444);
    giveUp.bg.off('pointerout').on('pointerout', () => this.unhighlightBtn(btnCount));
    btnCount++;

    // Keyboard
    this.kbSelected = 0;
    this.keyHandler = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      if (key === 'w' || key === 'arrowup') {
        this.kbSelected = (this.kbSelected - 1 + btnCount) % btnCount;
      } else if (key === 's' || key === 'arrowdown') {
        this.kbSelected = (this.kbSelected + 1) % btnCount;
      } else if ((key === 'enter' || key === ' ') && canAfford && this.kbSelected === 0) {
        this.accept();
      } else if ((key === 'enter' || key === ' ') && (!canAfford || this.kbSelected === btnCount - 1)) {
        this.decline();
      } else if (key === 'escape') {
        this.decline();
      }
    };
    window.addEventListener('keydown', this.keyHandler);

    // Gamepad — A = select, B = decline
    this.gpNav = new GamepadNav(this, btnCount, (i) => {
      if (canAfford && i === 0) this.accept();
      else this.decline();
    }, () => this.decline());

    this.events.once('shutdown', () => this.shutdown());
  }

  update(_time: number): void {
    this.gpNav.update(_time);
    const pad = this.input.gamepad?.pad1;
    const sel = pad ? this.gpNav.getSelected() : this.kbSelected;
    for (let i = 0; i < this.buttons.length; i++) {
      this.buttons[i].setFillStyle(i === sel ? this.hoverFills[i] : this.defaultFills[i]);
    }
  }

  private unhighlightBtn(index: number): void {
    this.buttons[index]?.setFillStyle(this.defaultFills[index]);
  }

  private accept(): void {
    this.cleanupKeyHandler();
    const gameScene = this.scene.get('Game');
    GameEvents.emit(gameScene.events, 'revive-accept');
  }

  private decline(): void {
    this.cleanupKeyHandler();
    const gameScene = this.scene.get('Game');
    GameEvents.emit(gameScene.events, 'revive-decline');
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
