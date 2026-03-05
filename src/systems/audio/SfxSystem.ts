import { loadSettings } from '../../ui/preferences';

type SfxName =
  | 'gem-collect' | 'gold-collect' | 'heal' | 'vortex'
  | 'level-up' | 'ability-select' | 'game-start'
  | 'player-hit' | 'player-death' | 'boss-spawn'
  | 'enemy-hit' | 'enemy-kill' | 'weapon-fire';

const DEBOUNCE: Record<SfxName, number> = {
  'gem-collect': 50,
  'gold-collect': 50,
  'heal': 200,
  'vortex': 500,
  'level-up': 500,
  'ability-select': 300,
  'game-start': 1000,
  'player-hit': 200,
  'player-death': 1000,
  'boss-spawn': 500,
  'enemy-hit': 30,
  'enemy-kill': 50,
  'weapon-fire': 50,
};

export class SfxSystem {
  private static _instance: SfxSystem | null = null;

  static get instance(): SfxSystem {
    if (!this._instance) this._instance = new SfxSystem();
    return this._instance;
  }

  private ctx: AudioContext | null = null;
  private gain: GainNode | null = null;
  private enabled: boolean;
  private volume: number;
  private lastPlayed: Map<string, number> = new Map();

  private sfxHandler = (e: Event) => {
    this.play((e as CustomEvent).detail as SfxName);
  };

  private constructor() {
    const settings = loadSettings();
    this.enabled = settings.sfxEnabled ?? true;
    this.volume = settings.sfxVolume ?? 0.5;
    document.addEventListener('sfx', this.sfxHandler);
  }

  init(ctx: AudioContext): void {
    if (this.ctx === ctx) return;
    this.ctx = ctx;
    this.gain = ctx.createGain();
    this.gain.gain.value = this.volume;
    this.gain.connect(ctx.destination);
  }

  setEnabled(on: boolean): void {
    this.enabled = on;
  }

  setVolume(v: number): void {
    this.volume = Math.max(0, Math.min(1, v));
    if (this.gain && this.ctx) {
      this.gain.gain.setTargetAtTime(this.volume, this.ctx.currentTime, 0.05);
    }
  }

  private play(name: SfxName): void {
    if (!this.enabled || !this.ctx || !this.gain) return;

    const now = performance.now();
    const debounce = DEBOUNCE[name];
    if (debounce !== undefined) {
      const last = this.lastPlayed.get(name) ?? 0;
      if (now - last < debounce) return;
    }
    this.lastPlayed.set(name, now);

    const fn = SYNTHS[name];
    if (fn) fn(this.ctx, this.gain);
  }
}

// --- Synthesis helpers ---

function playOsc(
  ctx: AudioContext, dest: AudioNode,
  type: OscillatorType, freqStart: number, freqEnd: number,
  duration: number, gainVal: number = 0.3,
): void {
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freqStart, ctx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(Math.max(freqEnd, 1), ctx.currentTime + duration);
  g.gain.setValueAtTime(gainVal, ctx.currentTime);
  g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
  osc.connect(g).connect(dest);
  osc.start();
  osc.stop(ctx.currentTime + duration);
}

function playNoise(
  ctx: AudioContext, dest: AudioNode,
  duration: number, gainVal: number,
  lpStart?: number, lpEnd?: number,
): void {
  const bufferSize = Math.floor(ctx.sampleRate * duration);
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;

  const src = ctx.createBufferSource();
  src.buffer = buffer;

  const g = ctx.createGain();
  g.gain.setValueAtTime(gainVal, ctx.currentTime);
  g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

  if (lpStart !== undefined && lpEnd !== undefined) {
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(lpStart, ctx.currentTime);
    filter.frequency.exponentialRampToValueAtTime(Math.max(lpEnd, 1), ctx.currentTime + duration);
    filter.Q.value = 2;
    src.connect(filter).connect(g).connect(dest);
  } else {
    src.connect(g).connect(dest);
  }

  src.start();
  src.stop(ctx.currentTime + duration);
}

// --- Sound definitions ---

const SYNTHS: Record<SfxName, (ctx: AudioContext, dest: AudioNode) => void> = {
  'gem-collect'(ctx, dest) {
    // Bright rising sine chirp
    playOsc(ctx, dest, 'sine', 800, 1600, 0.06, 0.25);
  },

  'gold-collect'(ctx, dest) {
    // Metallic ping — high sine + harmonic
    playOsc(ctx, dest, 'sine', 2000, 2000, 0.1, 0.2);
    playOsc(ctx, dest, 'sine', 5000, 5000, 0.1, 0.08);
  },

  'heal'(ctx, dest) {
    // Warm rising chord
    playOsc(ctx, dest, 'sine', 400, 800, 0.2, 0.2);
    playOsc(ctx, dest, 'sine', 500, 1000, 0.2, 0.1);
  },

  'vortex'(ctx, dest) {
    // Whooshing filtered noise sweep
    playNoise(ctx, dest, 0.4, 0.3, 200, 4000);
  },

  'level-up'(ctx, dest) {
    // Crashing impact — low rumble + noise burst + metallic ring
    playOsc(ctx, dest, 'sine', 80, 20, 0.3, 0.4);
    playOsc(ctx, dest, 'sawtooth', 150, 40, 0.25, 0.15);
    playNoise(ctx, dest, 0.2, 0.25, 100, 2000);
    // Metallic ring on top
    playOsc(ctx, dest, 'sine', 1200, 800, 0.3, 0.1);
  },

  'ability-select'(ctx, dest) {
    // Pleasant chime — ascending 3-note arpeggio C5→E5→G5
    const notes = [523.25, 659.25, 783.99];
    const dur = 0.08;
    for (let i = 0; i < notes.length; i++) {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = notes[i];
      const start = ctx.currentTime + i * dur;
      g.gain.setValueAtTime(0.001, ctx.currentTime);
      g.gain.setValueAtTime(0.25, start);
      g.gain.exponentialRampToValueAtTime(0.001, start + dur);
      osc.connect(g).connect(dest);
      osc.start(start);
      osc.stop(start + dur);
    }
  },

  'game-start'(ctx, dest) {
    // Bright fanfare chime — C5→G5 with shimmer
    playOsc(ctx, dest, 'sine', 523.25, 523.25, 0.15, 0.2);
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = 783.99;
    const start = ctx.currentTime + 0.12;
    g.gain.setValueAtTime(0.001, ctx.currentTime);
    g.gain.setValueAtTime(0.25, start);
    g.gain.exponentialRampToValueAtTime(0.001, start + 0.25);
    osc.connect(g).connect(dest);
    osc.start(start);
    osc.stop(start + 0.25);
    // Shimmer overtone
    playOsc(ctx, dest, 'sine', 1567.98, 1567.98, 0.3, 0.06);
  },

  'player-hit'(ctx, dest) {
    // Low thud + noise burst
    playOsc(ctx, dest, 'sine', 100, 30, 0.15, 0.35);
    playNoise(ctx, dest, 0.08, 0.15);
  },

  'player-death'(ctx, dest) {
    // Mournful descending tone — minor third fall with slow decay
    playOsc(ctx, dest, 'sine', 440, 440, 0.4, 0.3);
    // Descending minor third A4→F4
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(440, ctx.currentTime + 0.3);
    osc.frequency.exponentialRampToValueAtTime(349.23, ctx.currentTime + 0.8);
    g.gain.setValueAtTime(0.001, ctx.currentTime);
    g.gain.setValueAtTime(0.25, ctx.currentTime + 0.3);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.2);
    osc.connect(g).connect(dest);
    osc.start(ctx.currentTime + 0.3);
    osc.stop(ctx.currentTime + 1.2);
    // Low drone underneath
    playOsc(ctx, dest, 'sine', 110, 80, 1.0, 0.15);
    // Soft noise wash
    playNoise(ctx, dest, 0.8, 0.05, 200, 100);
  },

  'boss-spawn'(ctx, dest) {
    // Intimidating — deep rumble with dissonant brass-like stab
    playOsc(ctx, dest, 'sine', 55, 40, 0.6, 0.35);
    playOsc(ctx, dest, 'sawtooth', 55, 40, 0.5, 0.12);
    // Dissonant tritone stab
    playOsc(ctx, dest, 'sawtooth', 185, 150, 0.3, 0.15);
    playOsc(ctx, dest, 'square', 262, 220, 0.25, 0.08);
    // Rumbling noise
    playNoise(ctx, dest, 0.5, 0.15, 80, 300);
  },

  'enemy-hit'(ctx, dest) {
    // Quick percussive tick
    playOsc(ctx, dest, 'square', 800, 800, 0.02, 0.1);
  },

  'enemy-kill'(ctx, dest) {
    // Pop/burst
    playOsc(ctx, dest, 'sine', 300, 100, 0.08, 0.25);
    playNoise(ctx, dest, 0.06, 0.1);
  },

  'weapon-fire'(ctx, dest) {
    // Subtle whoosh
    playNoise(ctx, dest, 0.04, 0.08, 1000, 3000);
  },
};
