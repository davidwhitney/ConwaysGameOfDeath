import Phaser from 'phaser';
import { monoStyle } from '../ui/textStyles';
import { MenuNav, type MenuItemDef } from '../ui/MenuNav';
import { GameEvents } from '../systems/GameEvents';
import { setupMenuScene } from '../ui/sceneSetup';

export class ReviveScene extends Phaser.Scene {
  private menuNav!: MenuNav;
  private gold = 0;
  private cost = 0;
  private initData: { gold: number; cost: number } = { gold: 0, cost: 0 };

  constructor() {
    super({ key: 'Revive' });
  }

  init(data: { gold: number; cost: number }): void {
    this.initData = data;
    this.gold = data.gold;
    this.cost = data.cost;
  }

  create(): void {
    const { width, height } = setupMenuScene(this, { bringToTop: true, crt: false, initData: this.initData });
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
    const items: MenuItemDef[] = [];
    if (canAfford) {
      items.push({ x: width / 2, y: height * 0.55, width: 220, height: 45, label: 'REVIVE [Enter]', fontSize: '20px', textColor: '#ffffff', fillColor: 0x336633, hoverColor: 0x448844, action: () => this.accept() });
    }
    items.push({ x: width / 2, y: height * (canAfford ? 0.67 : 0.55), width: 220, height: 45, label: 'GIVE UP [Esc]', fontSize: '20px', textColor: '#ff8888', fillColor: 0x443333, hoverColor: 0x664444, action: () => this.decline() });

    this.menuNav = new MenuNav(this, items, () => this.decline());

  }

  update(): void {
    this.menuNav.update();
  }

  private accept(): void {
    const gameScene = this.scene.get('Game');
    GameEvents.emit(gameScene.events, 'revive-accept');
  }

  private decline(): void {
    const gameScene = this.scene.get('Game');
    GameEvents.emit(gameScene.events, 'revive-decline');
  }
}
