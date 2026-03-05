import Phaser from 'phaser';
import { applyUIZoom } from '../ui/uiScale';
import { monoStyle } from '../ui/textStyles';
import { applyCRT } from '../ui/crtEffect';
import { MenuNav } from '../ui/MenuNav';
import { loadSettings, saveSettings, clearAllData, type Settings } from '../ui/preferences';
import { onResizeRestart } from '../ui/resizeHandler';
import { LofiMusicSystem, STYLE_NAMES, ALL_STYLE_NAMES } from '../systems/audio/LofiMusicSystem';

const ZOOM_MIN = 0.5;
const ZOOM_MAX = 2.0;
const ZOOM_STEP = 0.25;
const VOL_STEP = 0.1;

const BTN = { textColor: '#ffffff', fillColor: 0x333366, hoverColor: 0x444488 } as const;
const BTN_WARN = { textColor: '#ff8888', fillColor: 0x443333, hoverColor: 0x664444 } as const;

export class SettingsScene extends Phaser.Scene {
  private menuNav!: MenuNav;
  private zoomValueText!: Phaser.GameObjects.Text;
  private volumeValueText!: Phaser.GameObjects.Text;
  private clearConfirm = false;
  private settings!: Settings;
  private returnTo: string = 'MainMenu';
  private initData?: { returnTo?: string };

  constructor() {
    super({ key: 'Settings' });
  }

  init(data?: { returnTo?: string }): void {
    this.initData = data;
    this.returnTo = data?.returnTo ?? 'MainMenu';
  }

  create(): void {
    this.scene.bringToTop();
    const { width, height } = applyUIZoom(this);
    applyCRT(this);

    // Background
    this.add.rectangle(width / 2, height / 2, width, height, 0x1a1a2e);

    // Title
    this.add.text(width / 2, height * 0.15, 'SETTINGS',
      monoStyle('36px', '#ffcc00', { fontStyle: 'bold' }),
    ).setOrigin(0.5);

    this.settings = loadSettings();

    // Row labels
    const label = (y: number, text: string) =>
      this.add.text(width / 2 - 100, height * y, text, monoStyle('18px', '#aaaacc')).setOrigin(0, 0.5);
    label(0.27, 'CRT Effect');
    label(0.33, 'Skip Intro');
    label(0.39, 'Music');
    label(0.45, 'Style');
    label(0.51, 'Volume');
    label(0.57, 'Zoom');

    this.volumeValueText = this.add.text(width / 2 + 80, height * 0.51,
      this.formatVolume(this.settings.musicVolume),
      monoStyle('16px', '#ffffff'),
    ).setOrigin(0.5);

    this.zoomValueText = this.add.text(width / 2 + 80, height * 0.57,
      this.formatZoom(this.settings.gameZoom),
      monoStyle('16px', '#ffffff'),
    ).setOrigin(0.5);

    const cx = width / 2;
    this.menuNav = new MenuNav(this, [
      { x: cx + 80, y: height * 0.27, width: 80, height: 40, label: this.settings.crtEnabled ? 'ON' : 'OFF', fontSize: '18px', ...BTN, action: () => this.toggleCRT() },
      { x: cx + 80, y: height * 0.33, width: 80, height: 40, label: this.settings.skipIntro ? 'ON' : 'OFF', fontSize: '18px', ...BTN, action: () => this.toggleSkipIntro() },
      { x: cx + 80, y: height * 0.39, width: 80, height: 40, label: this.settings.musicEnabled ? 'ON' : 'OFF', fontSize: '18px', ...BTN, action: () => this.toggleMusic() },
      { x: cx + 80, y: height * 0.45, width: 100, height: 40, label: this.settings.musicStyle.toUpperCase(), fontSize: '14px', ...BTN, action: () => this.cycleStyle() },
      { x: cx + 45, y: height * 0.51, width: 36, height: 36, label: '-', fontSize: '22px', ...BTN, action: () => this.adjustVolume(-VOL_STEP) },
      { x: cx + 115, y: height * 0.51, width: 36, height: 36, label: '+', fontSize: '22px', ...BTN, action: () => this.adjustVolume(VOL_STEP) },
      { x: cx + 45, y: height * 0.57, width: 36, height: 36, label: '-', fontSize: '22px', ...BTN, action: () => this.adjustZoom(-ZOOM_STEP) },
      { x: cx + 115, y: height * 0.57, width: 36, height: 36, label: '+', fontSize: '22px', ...BTN, action: () => this.adjustZoom(ZOOM_STEP) },
      { x: cx, y: height * 0.71, width: 200, height: 40, label: 'CLEAR DATA', fontSize: '14px', ...BTN_WARN, action: () => this.clearData() },
      { x: cx, y: height * 0.84, width: 200, height: 45, label: 'BACK', fontSize: '18px', ...BTN, action: () => this.goBack() },
    ], () => this.goBack());

    this.input.keyboard!.on('keydown-ESC', () => this.goBack());

    onResizeRestart(this, this.initData);

    this.events.once('shutdown', () => {
      this.input.keyboard!.removeAllListeners();
    });
  }

  update(_time: number): void {
    this.menuNav.update(_time);
  }

  private toggleCRT(): void {
    this.settings.crtEnabled = !this.settings.crtEnabled;
    saveSettings(this.settings);
    this.menuNav.getText(0).setText(this.settings.crtEnabled ? 'ON' : 'OFF');
    this.scene.restart({ returnTo: this.returnTo });
  }

  private toggleSkipIntro(): void {
    this.settings.skipIntro = !this.settings.skipIntro;
    saveSettings(this.settings);
    this.menuNav.getText(1).setText(this.settings.skipIntro ? 'ON' : 'OFF');
  }

  private toggleMusic(): void {
    this.settings.musicEnabled = !this.settings.musicEnabled;
    saveSettings(this.settings);
    LofiMusicSystem.instance.setEnabled(this.settings.musicEnabled);
    this.menuNav.getText(2).setText(this.settings.musicEnabled ? 'ON' : 'OFF');
  }

  private cycleStyle(): void {
    const idx = ALL_STYLE_NAMES.indexOf(this.settings.musicStyle);
    this.settings.musicStyle = ALL_STYLE_NAMES[(idx + 1) % ALL_STYLE_NAMES.length];
    saveSettings(this.settings);
    // Live preview: pick a random playable style when set to random
    const previewStyle = this.settings.musicStyle === 'random'
      ? STYLE_NAMES[Math.floor(Math.random() * STYLE_NAMES.length)]
      : this.settings.musicStyle;
    LofiMusicSystem.instance.setStyle(previewStyle);
    this.menuNav.getText(3).setText(this.settings.musicStyle.toUpperCase());
  }

  private adjustVolume(delta: number): void {
    const raw = Math.round((this.settings.musicVolume + delta) * 100) / 100;
    this.settings.musicVolume = Math.max(0, Math.min(1, raw));
    saveSettings(this.settings);
    LofiMusicSystem.instance.setVolume(this.settings.musicVolume);
    this.volumeValueText.setText(this.formatVolume(this.settings.musicVolume));
  }

  private formatVolume(v: number): string {
    return `${Math.round(v * 100)}%`;
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
      this.menuNav.getText(8).setText('ARE YOU SURE?');
      return;
    }
    clearAllData();
    this.settings = loadSettings();
    this.scene.restart({ returnTo: this.returnTo });
  }

  private goBack(): void {
    if (this.returnTo === 'Pause' && !this.scene.isPaused('Game')) {
      this.scene.start('MainMenu');
    } else {
      this.scene.start(this.returnTo);
    }
  }
}
