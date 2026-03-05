import { BaseMusicStyle, pick, STEPS_PER_BAR } from '../BaseMusicStyle';
import { DnbSynths } from './DnbSynths';

const BPM = 174;
const ROOTS = [33, 36, 31, 38]; // A1, C2, G1, D2

// Kick: half-time → breakbeat
const KICK_POOLS: number[][][] = [
  [[0, 8]],                                               // half-time
  [[0, 8], [0, 10]],                                      // slight variation
  [[0, 10], [0, 6, 10], [0, 8, 14]],                     // breakbeat
  [[0, 6, 10], [0, 3, 8, 14], [0, 6, 10, 14]],          // full breakbeat
];
// Snare: 2+4 → syncopated breaks
const SNARE_POOLS: number[][][] = [
  [[4, 12]],                                              // standard 2 & 4
  [[4, 12], [4, 14]],                                     // + flam
  [[4, 12], [4, 10, 14], [2, 8, 14]],                    // syncopated
  [[4, 12], [2, 4, 10, 14], [4, 6, 10, 14], [2, 8, 12, 14]], // breaks
];
// Hat: sparse → full 16ths
const HAT_POOLS: number[][][] = [
  [[0, 4, 8, 12]],                                        // quarter notes
  [[0, 2, 4, 8, 10, 12]],                                 // + offbeats
  [[0, 2, 4, 6, 8, 10, 12, 14]],                          // 8ths
  [[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15]], // 16ths
];
// Bass patterns: note offsets (0 = root, -1 = rest)
const BASS_POOLS: number[][][] = [
  [[0, -1, -1, -1, -1, -1, -1, -1]],                     // half-note sub
  [[0, -1, -1, -1, 0, -1, -1, -1]],                      // root on 1 + 3
  [[0, -1, 0, -1, -1, 0, -1, -1]],                       // rhythmic
  [[0, -1, 0, 5, -1, 0, -1, 7], [0, 3, -1, 0, -1, 5, -1, 0]], // melodic reese
];

export class DnbStyle extends BaseMusicStyle {
  private synths: DnbSynths;
  private rootIndex = 0;
  private root: number;
  private kickPattern: number[];
  private snarePattern: number[];
  private hatPattern: number[];
  private bassPattern: number[];

  constructor(ctx: AudioContext, output: GainNode) {
    super(ctx, BPM);
    this.synths = new DnbSynths(ctx, output);
    this.root = ROOTS[0];
    this.kickPattern = pick(KICK_POOLS[0]);
    this.snarePattern = pick(SNARE_POOLS[0]);
    this.hatPattern = pick(HAT_POOLS[0]);
    this.bassPattern = pick(BASS_POOLS[0]);
  }

  highlight(): void {
    this.highlightBarsLeft = 4;
    this.kickPattern = pick(KICK_POOLS[3]);
    this.snarePattern = pick(SNARE_POOLS[3]);
    this.hatPattern = pick(HAT_POOLS[3]);
    this.bassPattern = pick(BASS_POOLS[3]);
  }

  protected stopSynths(): void {
    this.synths.stopAll();
  }

  protected onBarEnd(): void {
    if (this.barCount % 4 === 0) {
      this.rootIndex = (this.rootIndex + 1) % ROOTS.length;
      this.root = ROOTS[this.rootIndex];
    }

    const refreshChance = 0.15 + this.intensity * 0.35;
    if (this.highlightBarsLeft <= 0 && this.barCount % 2 === 0 && Math.random() < refreshChance) {
      const t = this.tier();
      this.kickPattern = pick(KICK_POOLS[t]);
      this.snarePattern = pick(SNARE_POOLS[t]);
      this.hatPattern = pick(HAT_POOLS[t]);
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
    if (this.hatPattern.includes(step)) {
      this.synths.hihat(time, step % 2 === 1 ? 0.02 : 0.04);
    }

    // --- Reese bass ---
    const bassDiv = 2; // Play on 8th notes
    if (step % bassDiv === 0) {
      const bassIdx = (step / bassDiv) % this.bassPattern.length;
      const offset = this.bassPattern[bassIdx];
      if (offset >= 0) {
        this.synths.reese(time, this.root + offset, this.stepDuration * bassDiv * 0.9);
      }
    }

    // --- Pad: atmospheric, every 4 bars ---
    if (step === 0 && this.barCount % 4 === 0) {
      const chord = [this.root + 12, this.root + 15, this.root + 19];
      this.synths.pad(time, chord, barDuration * 4);
    }
    // Higher intensity: more frequent pads
    if (step === 0 && int > 0.5 && this.barCount % 2 === 0) {
      const chord = [this.root + 24, this.root + 27, this.root + 31];
      this.synths.pad(time, chord, barDuration * 2);
    }

    // --- Highlight: rapid snare rolls + stab chords ---
    if (hl) {
      // Snare roll on last beat
      if (step >= 12 && step % 1 === 0 && Math.random() < 0.5) {
        this.synths.snare(time);
      }
      // Stab chord hits
      if (step === 0 || step === 6) {
        const stabChord = [this.root + 12, this.root + 16, this.root + 19];
        this.synths.stab(time, stabChord, this.stepDuration * 2);
      }
    }
  }
}
