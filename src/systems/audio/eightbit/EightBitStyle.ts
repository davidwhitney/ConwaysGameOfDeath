import type { MusicStyle } from '../MusicStyle';
import { EightBitSynths } from './EightBitSynths';

const BPM = 160;
const STEPS_PER_BEAT = 4;
const STEPS_PER_BAR = STEPS_PER_BEAT * 4;
const LOOK_AHEAD_S = 0.1;
const SCHEDULE_INTERVAL_MS = 25;

const ROOTS = [40, 41, 43, 45];

// Kick patterns: quarter notes → blast beat
const KICK_POOLS: number[][][] = [
  [[0, 4, 8, 12]],                                          // quarter notes
  [[0, 2, 8, 10], [0, 4, 8, 12]],                           // double kick 8ths
  [[0, 2, 4, 6, 8, 10, 12, 14],                             // full 8th notes
   [0, 2, 4, 8, 10, 12]],                                   // gallop
  [[0, 2, 4, 6, 8, 10, 12, 14],                             // full 8th notes
   [0, 2, 4, 8, 10, 12],                                    // gallop
   [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15]], // blast beat
];

// Snare: basic → fills
const SNARE_POOLS: number[][][] = [
  [[4, 12]],                                                 // backbeat
  [[4, 12]],                                                 // backbeat
  [[4, 12], [4, 10, 12]],                                    // + ghost
  [[4, 12], [4, 10, 12, 14], [2, 4, 8, 12]],                // fills
];

// Hat: sparse → full 16ths
const HAT_POOLS: number[][][] = [
  [[0, 4, 8, 12]],                                           // quarters
  [[0, 2, 4, 8, 10, 12]],                                    // 8ths-ish
  [[0, 2, 4, 6, 8, 10, 12, 14]],                             // full 8ths
  [[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15]], // 16ths
];

// Riff patterns: basic riff → complex. -1 = rest.
const RIFF_POOLS: number[][][] = [
  [[0,-1,0,-1, -1,-1,-1,-1, 0,-1,0,-1, -1,-1,-1,-1],
   [0,-1,-1,0, -1,-1,-1,-1, 0,-1,-1,0, -1,-1,-1,-1]],       // basic riffs
  [[0,-1,0,-1, 0,-1,0,0, -1,0,-1,0, 0,-1,-1,0],             // gallop
   [0,-1,-1,0, -1,-1,0,-1, 0,-1,-1,0, -1,-1,0,-1]],         // syncopated
  [[0,-1,0,-1, 0,-1,0,0, -1,0,-1,0, 0,-1,-1,0],             // gallop
   [0,0,-1,0, -1,0,-1,-1, 0,-1,0,0, -1,0,-1,0]],            // thrash
  [[0,0,-1,0, -1,0,-1,-1, 0,-1,0,0, -1,0,-1,0],             // thrash
   [0,-1,-1,0, 0,-1,0,-1, 0,0,-1,-1, 0,-1,0,0],             // breakdown
   [0,0,0,-1, 0,0,-1,0, 0,-1,0,0, 0,0,-1,0]],               // tremolo
];

/** Pentatonic offsets for shred runs. */
const PENTA = [0, 3, 5, 7, 10, 12, 15, 17, 19, 24];

export class EightBitStyle implements MusicStyle {
  private ctx: AudioContext;
  private synths: EightBitSynths;
  private stepDuration: number;
  private intensity = 0;
  private highlightBarsLeft = 0;

  private currentStep = 0;
  private nextStepTime = 0;
  private timerId = 0;
  private running = false;

  private barCount = 0;
  private root: number;
  private kickPattern: number[];
  private snarePattern: number[];
  private hatPattern: number[];
  private riffPattern: number[];
  private shredBar = false;

  constructor(ctx: AudioContext, output: GainNode) {
    this.ctx = ctx;
    this.stepDuration = 60 / BPM / STEPS_PER_BEAT;
    this.synths = new EightBitSynths(ctx, output);
    this.root = pick(ROOTS);
    this.kickPattern = pick(KICK_POOLS[0]);
    this.snarePattern = pick(SNARE_POOLS[0]);
    this.hatPattern = pick(HAT_POOLS[0]);
    this.riffPattern = pick(RIFF_POOLS[0]);
  }

  setIntensity(v: number): void { this.intensity = v; }

  highlight(): void {
    this.highlightBarsLeft = 4;
    this.kickPattern = pick(KICK_POOLS[3]);
    this.snarePattern = pick(SNARE_POOLS[3]);
    this.hatPattern = pick(HAT_POOLS[3]);
    this.riffPattern = pick(RIFF_POOLS[3]);
    this.shredBar = true;
  }

  start(): void {
    this.running = true;
    this.currentStep = 0;
    this.nextStepTime = this.ctx.currentTime + 0.1;
    this.barCount = 0;
    this.schedule();
  }

  stop(): void {
    this.running = false;
    clearTimeout(this.timerId);
    this.synths.stopAll();
  }

  private tier(): number {
    return Math.min(3, Math.floor(this.intensity * 4));
  }

  private schedule(): void {
    const end = this.ctx.currentTime + LOOK_AHEAD_S;
    while (this.nextStepTime < end) {
      this.playStep(this.currentStep, this.nextStepTime);
      this.nextStepTime += this.stepDuration;
      this.currentStep++;
      if (this.currentStep >= STEPS_PER_BAR) {
        this.currentStep = 0;
        this.barCount++;

        if (this.highlightBarsLeft > 0) this.highlightBarsLeft--;

        // Shred bars: rare at low intensity, more frequent as intensity rises, always during highlight
        const shredChance = this.highlightBarsLeft > 0 ? 1 : 0.1 + this.intensity * 0.3;
        this.shredBar = this.barCount % 4 === 3 && Math.random() < shredChance;

        const t = this.tier();
        const refreshChance = 0.15 + this.intensity * 0.35;
        if (this.highlightBarsLeft <= 0 && this.barCount % 2 === 0 && Math.random() < refreshChance) {
          this.kickPattern = pick(KICK_POOLS[t]);
          this.snarePattern = pick(SNARE_POOLS[t]);
          this.hatPattern = pick(HAT_POOLS[t]);
          this.riffPattern = pick(RIFF_POOLS[t]);
        }
        const rootInterval = Math.max(2, 8 - Math.floor(this.intensity * 6));
        if (this.barCount % rootInterval === 0) {
          this.root = pick(ROOTS);
        }
      }
    }
    if (this.running) {
      this.timerId = window.setTimeout(() => this.schedule(), SCHEDULE_INTERVAL_MS);
    }
  }

  private playStep(step: number, time: number): void {
    const beatLen = this.stepDuration;
    const int = this.intensity;

    // --- Kick ---
    if (this.kickPattern.includes(step)) this.synths.kick(time);

    // --- Snare ---
    if (this.snarePattern.includes(step)) this.synths.snare(time);
    // Snare fill at high intensity every 4th bar
    if (int > 0.7 && this.barCount % 4 === 3 && (step === 13 || step === 14 || step === 15)) {
      this.synths.snare(time);
    }

    // --- Hi-hat ---
    if (this.hatPattern.includes(step)) this.synths.hihat(time);

    // --- Bass ---
    if (step === 0 || step === 8) {
      this.synths.bass(time, this.root, beatLen * 3);
    }
    // Walking bass at high intensity
    if (int > 0.6) {
      if (step === 4 && Math.random() < 0.4) {
        this.synths.bass(time, this.root + 5, beatLen * 2);
      }
      if (step === 12 && Math.random() < 0.4) {
        this.synths.bass(time, this.root + 7, beatLen * 2);
      }
    }

    if (this.shredBar) {
      // Shred run — rapid pentatonic notes
      const idx = step % PENTA.length;
      const ascending = this.barCount % 2 === 0;
      const noteIdx = ascending ? idx : PENTA.length - 1 - idx;
      this.synths.lead(time, this.root + 12 + PENTA[noteIdx], beatLen * 0.9);
    } else {
      // Power chord riff
      if (this.riffPattern[step] >= 0) {
        const variation = step >= 8 && Math.random() < 0.3 ? 7 : 0;
        this.synths.powerChord(time, this.root + variation, beatLen * 1.2);
      }
    }

    // --- Octave-up power chord accents at high intensity ---
    if (int > 0.8 && step === 0 && this.barCount % 2 === 0 && !this.shredBar) {
      this.synths.powerChord(time, this.root + 12, beatLen * 0.5);
    }

    // --- Highlight flourish: octave power chord + snare fills ---
    if (this.highlightBarsLeft > 0 && !this.shredBar) {
      if (step === 0) this.synths.powerChord(time, this.root + 12, beatLen * 0.5);
      if (step === 13 || step === 14 || step === 15) this.synths.snare(time);
    }
  }
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}
