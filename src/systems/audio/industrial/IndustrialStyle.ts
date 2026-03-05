import { BaseMusicStyle, pick, STEPS_PER_BAR } from '../BaseMusicStyle';
import { IndustrialSynths } from './IndustrialSynths';

const BPM = 125;
const ROOTS = [36, 37, 38, 40];

// Kick patterns: four-on-floor → pounding
const KICK_POOLS: number[][][] = [
  [[0, 4, 8, 12]],                                        // four-on-floor
  [[0, 4, 8, 12], [0, 4, 6, 8, 12]],                     // + ghost
  [[0, 4, 8, 12], [0, 2, 4, 8, 10, 12]],                 // double kicks
  [[0, 4, 8, 12], [0, 2, 4, 8, 10, 12], [0, 4, 6, 8, 12, 14]], // max
];

// Snare: backbeat → fills
const SNARE_POOLS: number[][][] = [
  [[4, 12]],                                               // backbeat
  [[4, 12], [4, 10, 12]],                                  // + ghost
  [[4, 12], [4, 10, 12], [2, 4, 12]],                     // syncopated
  [[4, 12], [4, 10, 12], [2, 4, 10, 12, 14]],             // fills
];

// Hat: quarters → mechanical 16ths
const HAT_POOLS: number[][][] = [
  [[0, 4, 8, 12]],                                         // quarters
  [[0, 2, 4, 8, 10, 12]],                                  // 8ths-ish
  [[0, 2, 4, 6, 8, 10, 12, 14]],                           // full 8ths
  [[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15]], // full 16ths
];

// Stab patterns: simple → aggressive
const STAB_POOLS: number[][][] = [
  [[1,0,0,0, 0,0,0,0, 1,0,0,0, 0,0,0,0]],                // sparse
  [[1,0,0,0, 0,0,1,0, 0,0,0,0, 1,0,0,0],
   [1,0,0,1, 0,0,0,0, 1,0,0,0, 0,0,0,0]],                // basic syncopated
  [[1,0,0,0, 0,0,1,0, 0,0,0,1, 0,0,0,0],
   [1,0,0,1, 0,0,0,0, 1,0,0,0, 0,1,0,0]],                // syncopated
  [[1,0,0,1, 0,0,1,0, 0,1,0,0, 1,0,0,0],
   [1,0,1,0, 0,0,0,0, 1,0,0,0, 1,0,0,0],
   [1,0,1,0, 1,0,0,1, 0,0,1,0, 0,1,0,1]],                // aggressive
];

export class IndustrialStyle extends BaseMusicStyle {
  private synths: IndustrialSynths;
  private root: number;
  private kickPattern: number[];
  private snarePattern: number[];
  private hatPattern: number[];
  private stabPattern: number[];

  constructor(ctx: AudioContext, output: GainNode) {
    super(ctx, BPM);
    this.synths = new IndustrialSynths(ctx, output);
    this.root = pick(ROOTS);
    this.kickPattern = pick(KICK_POOLS[0]);
    this.snarePattern = pick(SNARE_POOLS[0]);
    this.hatPattern = pick(HAT_POOLS[0]);
    this.stabPattern = pick(STAB_POOLS[0]);
  }

  highlight(): void {
    this.highlightBarsLeft = 4;
    this.kickPattern = pick(KICK_POOLS[3]);
    this.snarePattern = pick(SNARE_POOLS[3]);
    this.hatPattern = pick(HAT_POOLS[3]);
    this.stabPattern = pick(STAB_POOLS[3]);
  }

  protected onStart(): void {
    this.synths.startNoise(this.synths.masterFilter);
  }

  protected stopSynths(): void {
    this.synths.stopAll();
  }

  protected onBarEnd(): void {
    const t = this.tier();
    const refreshChance = 0.1 + this.intensity * 0.3;
    if (this.highlightBarsLeft <= 0 && this.barCount % 2 === 0 && Math.random() < refreshChance) {
      this.kickPattern = pick(KICK_POOLS[t]);
      this.snarePattern = pick(SNARE_POOLS[t]);
      this.hatPattern = pick(HAT_POOLS[t]);
      this.stabPattern = pick(STAB_POOLS[t]);
    }
    const rootInterval = Math.max(2, 8 - Math.floor(this.intensity * 6));
    if (this.barCount % rootInterval === 0) {
      this.root = pick(ROOTS);
    }
  }

  protected playStep(step: number, time: number): void {
    const beatLen = this.stepDuration;
    const barDuration = this.stepDuration * STEPS_PER_BAR;
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
    if (this.hatPattern.includes(step)) {
      const vel = step % 2 === 0 ? 0.04 : 0.02;
      this.synths.hihat(time, vel);
    }

    // --- Bass drone ---
    if (step === 0) {
      this.synths.bass(time, this.root, barDuration * 0.9);
    }
    // Extra bass hits at mid+ intensity
    if (int > 0.4 && step === 8 && Math.random() < 0.3 + int * 0.3) {
      this.synths.bass(time, this.root - 12, beatLen * 3);
    }

    // --- Stabs: always active, pattern controls density ---
    if (this.stabPattern[step]) {
      const note = this.root + 12 + (Math.random() < 0.3 ? 7 : 0);
      this.synths.stab(time, note, beatLen * 2);
    }

    // --- At high intensity: power stab accents on bar starts ---
    if (int > 0.8 && step === 0 && this.barCount % 2 === 0) {
      this.synths.stab(time, this.root + 24, beatLen * 0.5);
    }

    // --- Highlight flourish: power stabs + extra snare fills ---
    if (this.highlightBarsLeft > 0) {
      if (step === 0) this.synths.stab(time, this.root + 24, beatLen * 0.5);
      if (step === 8) this.synths.bass(time, this.root - 12, beatLen * 3);
      if (step === 13 || step === 14 || step === 15) this.synths.snare(time);
    }
  }
}
