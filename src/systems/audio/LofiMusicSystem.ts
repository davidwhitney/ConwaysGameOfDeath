import type { MusicStyle, MusicStyleFactory } from './MusicStyle';
import { LofiStyle } from './lofi/LofiStyle';
import { TripHopStyle } from './triphop/TripHopStyle';
import { loadSettings } from '../../ui/preferences';

export const MUSIC_STYLES: Record<string, MusicStyleFactory> = {
  lofi: (ctx, out) => new LofiStyle(ctx, out),
  triphop: (ctx, out) => new TripHopStyle(ctx, out),
};

export const STYLE_NAMES = Object.keys(MUSIC_STYLES);

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

  private constructor() {
    const settings = loadSettings();
    this.enabled = settings.musicEnabled ?? true;
    this.styleName = settings.musicStyle ?? 'triphop';
  }

  /** Provide Phaser's AudioContext. Safe to call multiple times. */
  init(ctx: AudioContext): void {
    if (this.audioCtx === ctx) return;
    this.audioCtx = ctx;
    this.masterGain = ctx.createGain();
    this.masterGain.gain.value = 0.5;
    this.masterGain.connect(ctx.destination);
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
    if (this.masterGain && this.audioCtx) {
      this.masterGain.gain.setTargetAtTime(
        Math.max(0, Math.min(1, v)),
        this.audioCtx.currentTime,
        0.05,
      );
    }
  }

  get isPlaying(): boolean {
    return this.playing;
  }
}
