import Phaser from 'phaser';
import { applyUIZoom } from '../ui/uiScale';
import { GamepadNav } from '../ui/gamepadNav';
import { createButton } from '../ui/buttonFactory';
import { monoStyle } from '../ui/textStyles';
import { applyCRT } from '../ui/crtEffect';
import { loadSettings, saveSettings } from '../ui/preferences';

export class SettingsScene extends Phaser.Scene {
  private gpNav!: GamepadNav;
  private buttons: Phaser.GameObjects.Rectangle[] = [];
  private readonly defaultFills = [0x333366, 0x333366];
  private readonly hoverFills = [0x444488, 0x444488];
  private crtBtnText!: Phaser.GameObjects.Text;
  private crtEnabled!: boolean;

  constructor() {
    super({ key: 'Settings' });
  }

  create(): void {
    const { width, height } = applyUIZoom(this);
    applyCRT(this);

    // Background
    this.add.rectangle(width / 2, height / 2, width, height, 0x1a1a2e);

    // Title
    this.add.text(width / 2, height * 0.15, 'SETTINGS',
      monoStyle('36px', '#ffcc00', { fontStyle: 'bold' }),
    ).setOrigin(0.5);

    // Load current settings
    this.crtEnabled = loadSettings().crtEnabled;

    // CRT toggle row
    this.add.text(width / 2 - 100, height * 0.40, 'CRT Effect',
      monoStyle('18px', '#aaaacc'),
    ).setOrigin(0, 0.5);

    const crtToggle = createButton(this, {
      x: width / 2 + 80, y: height * 0.40, width: 80, height: 40,
      label: this.crtEnabled ? 'ON' : 'OFF',
      fontSize: '18px', textColor: '#ffffff',
      fillColor: 0x333366, hoverColor: 0x444488,
      onClick: () => this.toggleCRT(),
    });
    this.crtBtnText = crtToggle.text;

    // Back button
    const back = createButton(this, {
      x: width / 2, y: height * 0.70, width: 200, height: 45,
      label: 'BACK', fontSize: '18px', textColor: '#ffffff',
      fillColor: 0x333366, hoverColor: 0x444488,
      onClick: () => this.goBack(),
    });

    this.buttons = [crtToggle.bg, back.bg];

    // Restore unhighlight behavior
    crtToggle.bg.off('pointerout').on('pointerout', () => this.unhighlightBtn(0));
    back.bg.off('pointerout').on('pointerout', () => this.unhighlightBtn(1));

    // Keyboard
    this.input.keyboard!.on('keydown-ESC', () => this.goBack());

    // Gamepad navigation — 2 items (CRT toggle, Back), B goes back
    const actions = [
      () => this.toggleCRT(),
      () => this.goBack(),
    ];
    this.gpNav = new GamepadNav(this, 2, (i) => actions[i](), () => this.goBack());

    // Cleanup on shutdown
    this.events.once('shutdown', () => {
      this.input.keyboard!.removeAllListeners();
    });
  }

  update(_time: number): void {
    this.gpNav.update(_time);
    const sel = this.gpNav.getSelected();
    for (let i = 0; i < this.buttons.length; i++) {
      this.buttons[i].setFillStyle(i === sel ? this.hoverFills[i] : this.defaultFills[i]);
    }
  }

  private toggleCRT(): void {
    this.crtEnabled = !this.crtEnabled;
    saveSettings({ crtEnabled: this.crtEnabled });
    this.crtBtnText.setText(this.crtEnabled ? 'ON' : 'OFF');
    // Restart scene to apply/remove CRT effects
    this.scene.restart();
  }

  private goBack(): void {
    this.scene.start('MainMenu');
  }

  private unhighlightBtn(index: number): void {
    this.buttons[index]?.setFillStyle(this.defaultFills[index]);
  }
}
