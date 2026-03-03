import Phaser from 'phaser';
import { applyUIZoom } from '../ui/uiScale';
import { GamepadNav } from '../ui/gamepadNav';
import { createButton } from '../ui/buttonFactory';
import { monoStyle } from '../ui/textStyles';
import { applyCRT } from '../ui/crtEffect';
import { loadSettings, saveSettings, clearAllData, type Settings } from '../ui/preferences';

const ZOOM_MIN = 0.5;
const ZOOM_MAX = 2.0;
const ZOOM_STEP = 0.25;

export class SettingsScene extends Phaser.Scene {
  private gpNav!: GamepadNav;
  private buttons: Phaser.GameObjects.Rectangle[] = [];
  private readonly defaultFills = [0x333366, 0x333366, 0x333366, 0x443333, 0x333366];
  private readonly hoverFills = [0x444488, 0x444488, 0x444488, 0x664444, 0x444488];
  private crtBtnText!: Phaser.GameObjects.Text;
  private zoomValueText!: Phaser.GameObjects.Text;
  private clearBtnText!: Phaser.GameObjects.Text;
  private clearConfirm = false;
  private settings!: Settings;
  private returnTo: string = 'MainMenu';

  constructor() {
    super({ key: 'Settings' });
  }

  init(data?: { returnTo?: string }): void {
    this.returnTo = data?.returnTo ?? 'MainMenu';
  }

  create(): void {
    // Ensure we render on top of all other scenes (e.g. paused Game)
    this.scene.bringToTop();

    const { width, height } = applyUIZoom(this);
    applyCRT(this);

    // Background
    this.add.rectangle(width / 2, height / 2, width, height, 0x1a1a2e);

    // Title
    this.add.text(width / 2, height * 0.15, 'SETTINGS',
      monoStyle('36px', '#ffcc00', { fontStyle: 'bold' }),
    ).setOrigin(0.5);

    // Load current settings
    this.settings = loadSettings();

    // ── CRT toggle row ──
    this.add.text(width / 2 - 100, height * 0.35, 'CRT Effect',
      monoStyle('18px', '#aaaacc'),
    ).setOrigin(0, 0.5);

    const crtToggle = createButton(this, {
      x: width / 2 + 80, y: height * 0.35, width: 80, height: 40,
      label: this.settings.crtEnabled ? 'ON' : 'OFF',
      fontSize: '18px', textColor: '#ffffff',
      fillColor: 0x333366, hoverColor: 0x444488,
      onClick: () => this.toggleCRT(),
    });
    this.crtBtnText = crtToggle.text;

    // ── Zoom slider row ──
    this.add.text(width / 2 - 100, height * 0.50, 'Zoom',
      monoStyle('18px', '#aaaacc'),
    ).setOrigin(0, 0.5);

    const zoomDown = createButton(this, {
      x: width / 2 + 45, y: height * 0.50, width: 36, height: 36,
      label: '-', fontSize: '22px', textColor: '#ffffff',
      fillColor: 0x333366, hoverColor: 0x444488,
      onClick: () => this.adjustZoom(-ZOOM_STEP),
    });

    this.zoomValueText = this.add.text(width / 2 + 80, height * 0.50,
      this.formatZoom(this.settings.gameZoom),
      monoStyle('16px', '#ffffff'),
    ).setOrigin(0.5);

    const zoomUp = createButton(this, {
      x: width / 2 + 115, y: height * 0.50, width: 36, height: 36,
      label: '+', fontSize: '22px', textColor: '#ffffff',
      fillColor: 0x333366, hoverColor: 0x444488,
      onClick: () => this.adjustZoom(ZOOM_STEP),
    });

    // ── Clear data button ──
    const clear = createButton(this, {
      x: width / 2, y: height * 0.65, width: 200, height: 40,
      label: 'CLEAR DATA', fontSize: '14px', textColor: '#ff8888',
      fillColor: 0x443333, hoverColor: 0x664444,
      onClick: () => this.clearData(),
    });
    this.clearBtnText = clear.text;

    // ── Back button ──
    const back = createButton(this, {
      x: width / 2, y: height * 0.80, width: 200, height: 45,
      label: 'BACK', fontSize: '18px', textColor: '#ffffff',
      fillColor: 0x333366, hoverColor: 0x444488,
      onClick: () => this.goBack(),
    });

    this.buttons = [crtToggle.bg, zoomDown.bg, zoomUp.bg, clear.bg, back.bg];

    // Restore unhighlight behavior
    this.buttons.forEach((btn, i) => {
      btn.off('pointerout').on('pointerout', () => this.unhighlightBtn(i));
    });

    // Keyboard
    this.input.keyboard!.on('keydown-ESC', () => this.goBack());

    // Gamepad navigation — 5 items, B goes back
    const actions = [
      () => this.toggleCRT(),
      () => this.adjustZoom(-ZOOM_STEP),
      () => this.adjustZoom(ZOOM_STEP),
      () => this.clearData(),
      () => this.goBack(),
    ];
    this.gpNav = new GamepadNav(this, 5, (i) => actions[i](), () => this.goBack());

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
    this.settings.crtEnabled = !this.settings.crtEnabled;
    saveSettings(this.settings);
    this.crtBtnText.setText(this.settings.crtEnabled ? 'ON' : 'OFF');
    // Restart scene to apply/remove CRT effects
    this.scene.restart({ returnTo: this.returnTo });
  }

  private adjustZoom(delta: number): void {
    const raw = Math.round((this.settings.gameZoom + delta) * 100) / 100;
    this.settings.gameZoom = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, raw));
    saveSettings(this.settings);
    this.zoomValueText.setText(this.formatZoom(this.settings.gameZoom));
  }

  private formatZoom(z: number): string {
    return `${Math.round(z * 100)}%`;
  }

  private clearData(): void {
    if (!this.clearConfirm) {
      this.clearConfirm = true;
      this.clearBtnText.setText('ARE YOU SURE?');
      return;
    }
    clearAllData();
    this.settings = loadSettings();
    this.scene.restart({ returnTo: this.returnTo });
  }

  private goBack(): void {
    // Only return to Pause if there's actually a paused game behind it
    if (this.returnTo === 'Pause' && !this.scene.isPaused('Game')) {
      this.scene.start('MainMenu');
    } else {
      this.scene.start(this.returnTo);
    }
  }

  private unhighlightBtn(index: number): void {
    this.buttons[index]?.setFillStyle(this.defaultFills[index]);
  }
}
