import { BaseMusicStyle, pick, STEPS_PER_BAR } from '../BaseMusicStyle';
import { FunkSynths } from './FunkSynths';

const BPM = 112;
const ROOTS = [40, 43, 45, 38]; // E2, G2, A2, D2

// Kick: 1+3 → syncopated funk
const KICK_POOLS: number[][][] = [
  [[0, 8]],                                               // 1 and 3
  [[0, 8], [0, 6, 8]],                                    // + offbeat
  [[0, 6, 8], [0, 6, 10], [0, 4, 6, 8]],                 // syncopated
  [[0, 3, 6, 8], [0, 6, 8, 11], [0, 3, 8, 11, 14]],     // full funk
];
// Snare: backbeat → ghost notes
const SNARE_POOLS: number[][][] = [
  [[4, 12]],                                              // backbeat
  [[4, 12]],                                              // backbeat
  [[4, 12]],                                              // keep backbeat, ghosts via velocity
  [[4, 12]],                                              // keep backbeat, ghosts via velocity
];
// Ghost note steps (played at low velocity)
const GHOST_POOLS: number[][][] = [
  [[]],                                                    // none
  [[7, 15]],                                               // subtle
  [[3, 7, 11, 15]],                                       // more ghosts
  [[1, 3, 7, 9, 11, 15], [3, 5, 7, 11, 13, 15]],        // full ghost pattern
];
// Hat: 8ths → 16th funk
const HAT_POOLS: number[][][] = [
  [[0, 2, 4, 6, 8, 10, 12, 14]],                         // 8ths
  [[0, 2, 4, 6, 8, 10, 12, 14]],                         // 8ths
  [[0, 1, 2, 4, 6, 8, 10, 12, 14, 15]],                  // partial 16ths
  [[0, 1, 2, 3, 4, 6, 8, 9, 10, 12, 14, 15]],           // 16th funk
];
// Clav: offbeat stabs → complex funk rhythms (MIDI offsets from root)
const CLAV_POOLS: { steps: number[]; notes: number[] }[][] = [
  [{ steps: [2, 10], notes: [0, 0] }],                                     // offbeat stabs
  [{ steps: [2, 6, 10], notes: [0, 4, 0] }],                              // + extra hit
  [{ steps: [2, 5, 6, 10, 13], notes: [0, 7, 4, 0, 7] }],               // funk rhythm
  [{ steps: [1, 2, 5, 6, 9, 10, 13, 14], notes: [0, 4, 7, 4, 0, 7, 4, 0] }], // full funk
];
// Bass: root-fifth → walking patterns (MIDI offsets)
const BASS_POOLS: { steps: number[]; notes: number[] }[][] = [
  [{ steps: [0, 8], notes: [0, 7] }],                                    // root-fifth
  [{ steps: [0, 6, 8], notes: [0, 5, 7] }],                              // + approach
  [{ steps: [0, 4, 6, 8, 12], notes: [0, 3, 5, 7, 5] }],               // walking
  [{ steps: [0, 2, 4, 6, 8, 10, 12, 14], notes: [0, 3, 5, 7, 5, 3, 0, -2] }], // full walk
];

export class FunkStyle extends BaseMusicStyle {
  protected declare synths: FunkSynths;
  private rootIndex = 0;
  private root: number;
  private kickPattern: number[];
  private snarePattern: number[];
  private ghostPattern: number[];
  private hatPattern: number[];
  private clavPattern: { steps: number[]; notes: number[] };
  private bassPattern: { steps: number[]; notes: number[] };

  constructor(ctx: AudioContext, output: GainNode) {
    super(ctx, BPM, new FunkSynths(ctx, output));
    this.root = ROOTS[0];
    this.kickPattern = pick(KICK_POOLS[0]);
    this.snarePattern = pick(SNARE_POOLS[0]);
    this.ghostPattern = pick(GHOST_POOLS[0]);
    this.hatPattern = pick(HAT_POOLS[0]);
    this.clavPattern = pick(CLAV_POOLS[0]);
    this.bassPattern = pick(BASS_POOLS[0]);
  }

  highlight(): void {
    this.highlightBarsLeft = 4;
    this.kickPattern = pick(KICK_POOLS[3]);
    this.snarePattern = pick(SNARE_POOLS[3]);
    this.ghostPattern = pick(GHOST_POOLS[3]);
    this.hatPattern = pick(HAT_POOLS[3]);
    this.clavPattern = pick(CLAV_POOLS[3]);
    this.bassPattern = pick(BASS_POOLS[3]);
  }

  protected onBarEnd(): void {
    if (this.barCount % 4 === 0) {
      this.rootIndex = (this.rootIndex + 1) % ROOTS.length;
      this.root = ROOTS[this.rootIndex];
    }

    if (this.shouldRefreshPatterns(0.15, 0.35)) {
      const t = this.tier();
      this.kickPattern = pick(KICK_POOLS[t]);
      this.snarePattern = pick(SNARE_POOLS[t]);
      this.ghostPattern = pick(GHOST_POOLS[t]);
      this.hatPattern = pick(HAT_POOLS[t]);
      this.clavPattern = pick(CLAV_POOLS[t]);
      this.bassPattern = pick(BASS_POOLS[t]);
    }
  }

  protected playStep(step: number, time: number): void {
    const barDuration = this.stepDuration * STEPS_PER_BAR;
    const int = this.intensity;
    const hl = this.highlightBarsLeft > 0;

    // --- Drums ---
    if (this.kickPattern.includes(step)) this.synths.kick(time);
    if (this.snarePattern.includes(step)) this.synths.snare(time);
    if (this.ghostPattern.includes(step)) this.synths.snare(time, 0.3);
    if (this.hatPattern.includes(step)) {
      this.synths.hihat(time, step % 2 === 1 ? 0.02 : 0.04);
    }

    // --- Clav (wah) ---
    const wahSpeed = 1 + int * 3; // Faster wah at high intensity
    const clavIdx = this.clavPattern.steps.indexOf(step);
    if (clavIdx >= 0) {
      const note = this.root + 12 + this.clavPattern.notes[clavIdx];
      this.synths.clav(time, note, this.stepDuration * 1.5, wahSpeed);
    }

    // --- Bass ---
    const bassIdx = this.bassPattern.steps.indexOf(step);
    if (bassIdx >= 0) {
      const note = this.root - 12 + this.bassPattern.notes[bassIdx];
      this.synths.bass(time, note, this.stepDuration * 1.5);
    }

    // --- Background pad ---
    if (step === 0 && this.barCount % 4 === 0) {
      const chord = [this.root + 12, this.root + 16, this.root + 19];
      this.synths.pad(time, chord, barDuration * 4);
    }

    // --- Highlight: clav solo flurry + bass fills ---
    if (hl) {
      // Extra clav hits on every other 16th
      if (step % 2 === 1 && clavIdx < 0 && Math.random() < 0.4) {
        const intervals = [0, 3, 5, 7, 10, 12];
        const note = this.root + 12 + pick(intervals);
        this.synths.clav(time, note, this.stepDuration * 0.8, wahSpeed);
      }
      // Bass fill on last beat
      if (step >= 12 && bassIdx < 0) {
        const fillNotes = [0, 3, 5, 7];
        this.synths.bass(time, this.root - 12 + pick(fillNotes), this.stepDuration);
      }
    }
  }
}
