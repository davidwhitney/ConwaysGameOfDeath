import Phaser from 'phaser';
import { monoStyle } from '../ui/textStyles';
import { MenuNav } from '../ui/MenuNav';
import { loadSettings, saveSettings, clearAllData, type Settings } from '../ui/saveData';
import { setupMenuScene } from '../ui/sceneSetup';
import { LofiMusicSystem, STYLE_NAMES, ALL_STYLE_NAMES } from '../systems/audio/LofiMusicSystem';
import { SfxSystem } from '../systems/audio/SfxSystem';

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
  private sfxVolumeValueText!: Phaser.GameObjects.Text;
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
    const { width, height } = setupMenuScene(this, { bringToTop: true, initData: this.initData });

    // Background
    this.add.rectangle(width / 2, height / 2, width, height, 0x1a1a2e);

    // Title
    this.add.text(width / 2, height * 0.12, 'SETTINGS',
      monoStyle('36px', '#ffcc00', { fontStyle: 'bold' }),
    ).setOrigin(0.5);

    this.settings = loadSettings();

    // Row layout — uniform spacing and control width
    const ROW_W = 100;       // all controls share this width
    const ROW_H = 34;        // uniform row height
    const SLIDER_BTN_W = 36; // +/- button width inside slider rows
    const rows = [0.20, 0.265, 0.33, 0.395, 0.46, 0.525, 0.59, 0.655];
    const cx = width / 2;
    const ctrlX = cx + 80;   // center of control column
    const minusX = ctrlX - ROW_W / 2 + SLIDER_BTN_W / 2;  // left edge aligns with toggle
    const plusX = ctrlX + ROW_W / 2 - SLIDER_BTN_W / 2;   // right edge aligns with toggle

    const label = (y: number, text: string) =>
      this.add.text(cx - 100, height * y, text, monoStyle('18px', '#aaaacc')).setOrigin(0, 0.5);
    label(rows[0], 'CRT Effect');
    label(rows[1], 'Skip Intro');
    label(rows[2], 'Music');
    label(rows[3], 'Style');
    label(rows[4], 'Music Vol');
    label(rows[5], 'SFX');
    label(rows[6], 'SFX Vol');
    label(rows[7], 'Zoom');

    this.volumeValueText = this.add.text(ctrlX, height * rows[4],
      this.formatPercent(this.settings.musicVolume),
      monoStyle('16px', '#ffffff'),
    ).setOrigin(0.5);

    this.sfxVolumeValueText = this.add.text(ctrlX, height * rows[6],
      this.formatPercent(this.settings.sfxVolume),
      monoStyle('16px', '#ffffff'),
    ).setOrigin(0.5);

    this.zoomValueText = this.add.text(ctrlX, height * rows[7],
      this.formatPercent(this.settings.gameZoom),
      monoStyle('16px', '#ffffff'),
    ).setOrigin(0.5);

    this.menuNav = new MenuNav(this, [
      /* 0  */ { x: ctrlX, y: height * rows[0], width: ROW_W, height: ROW_H, label: this.settings.crtEnabled ? 'ON' : 'OFF', fontSize: '18px', ...BTN, action: () => this.toggleCRT() },
      /* 1  */ { x: ctrlX, y: height * rows[1], width: ROW_W, height: ROW_H, label: this.settings.skipIntro ? 'ON' : 'OFF', fontSize: '18px', ...BTN, action: () => this.toggleSkipIntro() },
      /* 2  */ { x: ctrlX, y: height * rows[2], width: ROW_W, height: ROW_H, label: this.settings.musicEnabled ? 'ON' : 'OFF', fontSize: '18px', ...BTN, action: () => this.toggleMusic() },
      /* 3  */ { x: ctrlX, y: height * rows[3], width: ROW_W, height: ROW_H, label: this.settings.musicStyle.toUpperCase(), fontSize: '14px', ...BTN, action: () => this.cycleStyle() },
      /* 4  */ { x: minusX, y: height * rows[4], width: SLIDER_BTN_W, height: ROW_H, label: '-', fontSize: '22px', ...BTN, action: () => this.adjustVolume(-VOL_STEP) },
      /* 5  */ { x: plusX,  y: height * rows[4], width: SLIDER_BTN_W, height: ROW_H, label: '+', fontSize: '22px', ...BTN, action: () => this.adjustVolume(VOL_STEP) },
      /* 6  */ { x: ctrlX, y: height * rows[5], width: ROW_W, height: ROW_H, label: this.settings.sfxEnabled ? 'ON' : 'OFF', fontSize: '18px', ...BTN, action: () => this.toggleSfx() },
      /* 7  */ { x: minusX, y: height * rows[6], width: SLIDER_BTN_W, height: ROW_H, label: '-', fontSize: '22px', ...BTN, action: () => this.adjustSfxVolume(-VOL_STEP) },
      /* 8  */ { x: plusX,  y: height * rows[6], width: SLIDER_BTN_W, height: ROW_H, label: '+', fontSize: '22px', ...BTN, action: () => this.adjustSfxVolume(VOL_STEP) },
      /* 9  */ { x: minusX, y: height * rows[7], width: SLIDER_BTN_W, height: ROW_H, label: '-', fontSize: '22px', ...BTN, action: () => this.adjustZoom(-ZOOM_STEP) },
      /* 10 */ { x: plusX,  y: height * rows[7], width: SLIDER_BTN_W, height: ROW_H, label: '+', fontSize: '22px', ...BTN, action: () => this.adjustZoom(ZOOM_STEP) },
      /* 11 */ { x: cx, y: height * 0.76, width: 200, height: 40, label: 'CLEAR DATA', fontSize: '14px', ...BTN_WARN, action: () => this.clearData() },
      /* 12 */ { x: cx, y: height * 0.87, width: 200, height: 45, label: 'BACK', fontSize: '18px', ...BTN, action: () => this.goBack() },
    ], () => this.goBack());

  }

  update(): void {
    this.menuNav.update();
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
    this.adjustVolumeSetting('musicVolume', delta, this.volumeValueText, LofiMusicSystem.instance);
  }

  private toggleSfx(): void {
    this.settings.sfxEnabled = !this.settings.sfxEnabled;
    saveSettings(this.settings);
    SfxSystem.instance.setEnabled(this.settings.sfxEnabled);
    this.menuNav.getText(6).setText(this.settings.sfxEnabled ? 'ON' : 'OFF');
  }

  private adjustSfxVolume(delta: number): void {
    this.adjustVolumeSetting('sfxVolume', delta, this.sfxVolumeValueText, SfxSystem.instance);
  }

  private adjustVolumeSetting(
    key: 'musicVolume' | 'sfxVolume', delta: number,
    display: Phaser.GameObjects.Text,
    system: { setVolume(v: number): void },
  ): void {
    const raw = Math.round((this.settings[key] + delta) * 100) / 100;
    this.settings[key] = Math.max(0, Math.min(1, raw));
    saveSettings(this.settings);
    system.setVolume(this.settings[key]);
    display.setText(this.formatPercent(this.settings[key]));
  }

  private formatPercent(v: number): string {
    return `${Math.round(v * 100)}%`;
  }

  private adjustZoom(delta: number): void {
    const raw = Math.round((this.settings.gameZoom + delta) * 100) / 100;
    this.settings.gameZoom = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, raw));
    saveSettings(this.settings);
    this.zoomValueText.setText(this.formatPercent(this.settings.gameZoom));
  }

  private clearData(): void {
    if (!this.clearConfirm) {
      this.clearConfirm = true;
      this.menuNav.getText(11).setText('ARE YOU SURE?');
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
