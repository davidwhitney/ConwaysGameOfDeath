import type { MusicStyle, MusicStyleFactory } from './MusicStyle';
import { LofiStyle } from './lofi/LofiStyle';
import { TripHopStyle } from './triphop/TripHopStyle';
import { DjentStyle } from './djent/DjentStyle';
import { IndustrialStyle } from './industrial/IndustrialStyle';
import { TechnoStyle } from './techno/TechnoStyle';
import { EightBitStyle } from './eightbit/EightBitStyle';
import { loadSettings } from '../../ui/preferences';

export const MUSIC_STYLES: Record<string, MusicStyleFactory> = {
  lofi: (ctx, out) => new LofiStyle(ctx, out),
  triphop: (ctx, out) => new TripHopStyle(ctx, out),
  djent: (ctx, out) => new DjentStyle(ctx, out),
  industrial: (ctx, out) => new IndustrialStyle(ctx, out),
  techno: (ctx, out) => new TechnoStyle(ctx, out),
  '8bit-metal': (ctx, out) => new EightBitStyle(ctx, out),
};

export const STYLE_NAMES = Object.keys(MUSIC_STYLES);
export const ALL_STYLE_NAMES = ['random', ...STYLE_NAMES];

export class LofiMusicSystem {
  private static _instance: LofiMusicSystem | null = null;

  static get instance(): LofiMusicSystem {
    if (!this._instance) this._instance = new LofiMusicSystem();
    return this._instance;
  }

  private audioCtx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private currentStyle: MusicStyle | null = null;
  private playing = false;
  private enabled: boolean;
  private styleName: string;
  private volume: number;

  private intensityHandler = (e: Event) => {
    this.currentStyle?.setIntensity?.((e as CustomEvent).detail);
  };

  private highlightHandler = (e: Event) => {
    this.currentStyle?.highlight?.((e as CustomEvent).detail);
  };

  private constructor() {
    const settings = loadSettings();
    this.enabled = settings.musicEnabled ?? true;
    this.styleName = settings.musicStyle ?? 'triphop';
    this.volume = settings.musicVolume ?? 0.5;
    document.addEventListener('game-intensity', this.intensityHandler);
    document.addEventListener('game-highlight', this.highlightHandler);
  }

  /** Provide Phaser's AudioContext. Safe to call multiple times. */
  init(ctx: AudioContext): void {
    if (this.audioCtx === ctx) return;
    this.audioCtx = ctx;
    this.masterGain = ctx.createGain();
    this.masterGain.gain.value = this.volume;
    this.masterGain.connect(ctx.destination);

    // When browser unlocks the AudioContext after user gesture, auto-start music
    if (ctx.state === 'suspended') {
      const onUnlock = () => {
        ctx.removeEventListener('statechange', onUnlock);
        if (this.enabled && !this.playing) this.start();
      };
      ctx.addEventListener('statechange', onUnlock);
    }
  }

  start(): void {
    if (!this.enabled || this.playing || !this.audioCtx || !this.masterGain) return;
    const factory = MUSIC_STYLES[this.styleName] ?? MUSIC_STYLES.triphop;
    this.currentStyle = factory(this.audioCtx, this.masterGain);
    this.currentStyle.start();
    this.playing = true;
  }

  stop(): void {
    this.currentStyle?.stop();
    this.currentStyle = null;
    this.playing = false;
  }

  setEnabled(on: boolean): void {
    this.enabled = on;
    if (!on && this.playing) this.stop();
    if (on && !this.playing) this.start();
  }

  setStyle(name: string): void {
    if (name === this.styleName) return;
    this.styleName = name;
    if (this.playing) {
      this.stop();
      this.start();
    }
  }

  getStyle(): string {
    return this.styleName;
  }

  setVolume(v: number): void {
    this.volume = Math.max(0, Math.min(1, v));
    if (this.masterGain && this.audioCtx) {
      this.masterGain.gain.setTargetAtTime(
        this.volume,
        this.audioCtx.currentTime,
        0.05,
      );
    }
  }

  setIntensity(v: number): void {
    this.currentStyle?.setIntensity?.(v);
  }

  get isPlaying(): boolean {
    return this.playing;
  }
}
