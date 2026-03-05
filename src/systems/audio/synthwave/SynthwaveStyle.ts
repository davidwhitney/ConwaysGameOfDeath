import { BaseMusicStyle, pick, STEPS_PER_BAR } from '../BaseMusicStyle';
import { SynthwaveSynths } from './SynthwaveSynths';

const BPM = 100;
const ROOTS = [45, 43, 40, 41]; // A2, G2, E2, F2

// Kick: 4-on-floor → offbeats
const KICK_POOLS: number[][][] = [
  [[0, 4, 8, 12]],                                        // straight 4-on-floor
  [[0, 4, 8, 12], [0, 4, 8, 14]],                         // + offbeat variation
  [[0, 4, 8, 12], [0, 4, 8, 14], [0, 4, 10, 14]],        // + syncopation
  [[0, 4, 8, 12], [0, 2, 4, 8, 12], [0, 4, 8, 10, 14]],  // + offbeats
];
// Snare: backbeat → fills
const SNARE_POOLS: number[][][] = [
  [[4, 12]],                                               // standard backbeat
  [[4, 12], [4, 12, 14]],                                  // + fill
  [[4, 12], [4, 12, 14], [4, 10, 12]],                    // + ghost
  [[4, 12], [4, 10, 12, 14], [4, 8, 12, 14, 15]],        // fills
];
// Hat: 8ths → 16ths
const HAT_POOLS: number[][][] = [
  [[0, 2, 4, 6, 8, 10, 12, 14]],                          // straight 8ths
  [[0, 2, 4, 6, 8, 10, 12, 14]],                          // 8ths
  [[0, 1, 2, 4, 6, 8, 10, 12, 14]],                       // partial 16ths
  [[0, 1, 2, 3, 4, 6, 8, 10, 12, 13, 14, 15]],           // 16ths
];
// Arp patterns: notes as MIDI offsets from root, -1 = rest
const ARP_POOLS: number[][][] = [
  [[0, 4, 7, 12]],                                        // ascending triad
  [[0, 4, 7, 12], [12, 7, 4, 0]],                        // + descending
  [[0, 4, 7, 12, 7, 4], [0, 7, 12, 16, 12, 7]],         // arpeggios
  [[0, -1, 7, 12, -1, 4, 7, -1], [0, 4, 7, 12, 16, 12, 7, 4]], // complex
];

export class SynthwaveStyle extends BaseMusicStyle {
  protected declare synths: SynthwaveSynths;
  private rootIndex = 0;
  private root: number;
  private kickPattern: number[];
  private snarePattern: number[];
  private hatPattern: number[];
  private arpPattern: number[];

  constructor(ctx: AudioContext, output: GainNode) {
    super(ctx, BPM, new SynthwaveSynths(ctx, output));
    this.root = ROOTS[0];
    this.kickPattern = pick(KICK_POOLS[0]);
    this.snarePattern = pick(SNARE_POOLS[0]);
    this.hatPattern = pick(HAT_POOLS[0]);
    this.arpPattern = pick(ARP_POOLS[0]);
  }

  highlight(): void {
    this.highlightBarsLeft = 4;
    this.kickPattern = pick(KICK_POOLS[3]);
    this.snarePattern = pick(SNARE_POOLS[3]);
    this.hatPattern = pick(HAT_POOLS[3]);
    this.arpPattern = pick(ARP_POOLS[3]);
  }

  protected onBarEnd(): void {
    this.rootIndex = (this.rootIndex + 1) % ROOTS.length;
    this.root = ROOTS[this.rootIndex];

    if (this.shouldRefreshPatterns(0.15, 0.35)) {
      const t = this.tier();
      this.kickPattern = pick(KICK_POOLS[t]);
      this.snarePattern = pick(SNARE_POOLS[t]);
      this.hatPattern = pick(HAT_POOLS[t]);
      this.arpPattern = pick(ARP_POOLS[t]);
    }
  }

  protected playStep(step: number, time: number): void {
    const barDuration = this.stepDuration * STEPS_PER_BAR;
    const int = this.intensity;
    const hl = this.highlightBarsLeft > 0;

    // --- Drums ---
    if (this.kickPattern.includes(step)) this.synths.kick(time);
    if (this.snarePattern.includes(step)) this.synths.snare(time);
    if (this.hatPattern.includes(step)) {
      this.synths.hihat(time, step % 2 === 1 ? 0.03 : 0.05);
    }

    // --- Pad: every 2 bars ---
    if (step === 0 && this.barCount % 2 === 0) {
      const chord = [this.root, this.root + 4, this.root + 7];
      this.synths.pad(time, chord.map(n => n + 12), barDuration * 2);
    }
    // Highlight pad swell — brighter, louder
    if (hl && step === 0) {
      const chord = [this.root, this.root + 4, this.root + 7, this.root + 11];
      this.synths.pad(time, chord.map(n => n + 24), barDuration);
    }

    // --- Arp ---
    if (int > 0.15 || hl) {
      // Arp speed increases with intensity
      const arpDiv = int > 0.6 || hl ? 2 : 4; // 16ths vs 8ths
      if (step % arpDiv === 0) {
        const arpIdx = (step / arpDiv) % this.arpPattern.length;
        const offset = this.arpPattern[arpIdx];
        if (offset >= 0) {
          const note = this.root + 12 + offset;
          this.synths.arp(time, note, this.stepDuration * arpDiv * 0.8);
        }
      }
      // Highlight: octave-up arp layer
      if (hl && step % 4 === 2) {
        const arpIdx = (step / 2) % this.arpPattern.length;
        const offset = this.arpPattern[arpIdx];
        if (offset >= 0) {
          this.synths.arp(time, this.root + 24 + offset, this.stepDuration * 1.5);
        }
      }
    }

    // --- Bass: driving octave pattern ---
    if (step === 0 || step === 8) {
      this.synths.bass(time, this.root - 12, this.stepDuration * 3);
    }
    if (int > 0.4 && (step === 4 || step === 12)) {
      this.synths.bass(time, this.root - 12, this.stepDuration * 1.5);
    }

    // --- Highlight extra: snare fills ---
    if (hl && (step === 14 || step === 15)) {
      this.synths.snare(time);
    }
  }
}
