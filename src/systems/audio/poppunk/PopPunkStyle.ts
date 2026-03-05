import { BaseMusicStyle, pick, STEPS_PER_BAR } from '../BaseMusicStyle';
import { PopPunkSynths } from './PopPunkSynths';

const BPM = 170;

// Classic pop-punk progressions (I-V-vi-IV style), as MIDI root notes
const PROGRESSIONS: number[][] = [
  [40, 47, 45, 43], // E-B-A-G
  [43, 47, 40, 45], // G-B-E-A
  [45, 40, 47, 43], // A-E-B-G
  [40, 43, 45, 47], // E-G-A-B
];

// Kick: basic → driving
const KICK_POOLS: number[][][] = [
  [[0, 8]],                                                          // half notes
  [[0, 4, 8, 12]],                                                   // 4-on-floor
  [[0, 4, 8, 12], [0, 4, 8, 10, 12]],                               // + pickups
  [[0, 4, 8, 12], [0, 2, 4, 8, 10, 12], [0, 4, 6, 8, 12, 14]],    // driving
];
// Snare: backbeat → fills
const SNARE_POOLS: number[][][] = [
  [[4, 12]],                                                          // backbeat
  [[4, 12]],                                                          // backbeat
  [[4, 12], [4, 12, 14]],                                             // + fill
  [[4, 12], [4, 12, 14, 15], [4, 10, 12, 14]],                      // fills
];
// Hat: 8ths → 16ths
const HAT_POOLS: number[][][] = [
  [[0, 2, 4, 6, 8, 10, 12, 14]],                                     // straight 8ths
  [[0, 2, 4, 6, 8, 10, 12, 14]],                                     // 8ths
  [[0, 1, 2, 4, 6, 8, 10, 12, 14, 15]],                              // partial 16ths
  [[0, 1, 2, 3, 4, 6, 8, 10, 12, 13, 14, 15]],                      // 16ths
];

// Chord strum patterns: 0 = power chord, 1 = palm mute, -1 = rest
const STRUM_POOLS: number[][][] = [
  [[0, -1, -1, -1, 0, -1, -1, -1]],                                  // whole notes
  [[0, -1, 0, -1, 0, -1, 0, -1]],                                    // quarter strums
  [
    [0, 1, 0, -1, 0, 1, 0, -1],                                      // strum + mute
    [0, -1, 0, 1, 0, -1, 0, 1],
  ],
  [
    [0, 1, 0, 1, 0, 1, 0, 0],                                        // driving 8ths
    [0, 0, 1, 0, 0, 1, 0, 0],
    [0, 1, 0, 0, 1, 0, 0, 1],
  ],
];

// Octave lead melodies: MIDI offsets from root+12
const LEAD_POOLS: { steps: number[]; notes: number[] }[][] = [
  [
    { steps: [0, 4, 8, 12], notes: [0, 4, 7, 4] },
    { steps: [0, 8], notes: [0, 7] },
  ],
  [
    { steps: [0, 2, 4, 8, 10, 12], notes: [0, 4, 7, 12, 7, 4] },
    { steps: [0, 4, 6, 8, 12, 14], notes: [7, 4, 0, 7, 12, 7] },
    { steps: [0, 4, 8, 10, 12], notes: [0, 7, 12, 11, 7] },
  ],
  [
    { steps: [0, 2, 4, 6, 8, 10, 12, 14], notes: [0, 2, 4, 7, 12, 7, 4, 2] },
    { steps: [0, 2, 4, 6, 8, 10, 12, 14], notes: [12, 11, 7, 4, 0, 4, 7, 11] },
    { steps: [0, 2, 4, 8, 10, 12, 14], notes: [0, 4, 7, 12, 11, 7, 4] },
  ],
  [
    { steps: [0, 1, 2, 4, 6, 8, 10, 12, 14], notes: [0, 2, 4, 7, 12, 16, 12, 7, 4] },
    { steps: [0, 2, 4, 6, 8, 10, 12, 14], notes: [12, 11, 7, 4, 2, 4, 7, 11] },
    { steps: [0, 1, 2, 4, 6, 8, 10, 12, 14, 15], notes: [0, 4, 7, 12, 11, 7, 4, 0, 4, 7] },
  ],
];

// Bass patterns: MIDI offsets from chord root, -1 = rest
const BASS_POOLS: { steps: number[]; notes: number[] }[][] = [
  [{ steps: [0, 8], notes: [0, 0] }],                                // root on 1 + 3
  [
    { steps: [0, 4, 8, 12], notes: [0, 0, 0, 0] },                  // quarter notes
    { steps: [0, 6, 8], notes: [0, 7, 0] },
  ],
  [
    { steps: [0, 2, 4, 8, 10, 12], notes: [0, 0, 7, 0, 0, 5] },    // root-fifth
    { steps: [0, 4, 6, 8, 12, 14], notes: [0, 7, 5, 0, 5, 7] },
  ],
  [
    { steps: [0, 2, 4, 6, 8, 10, 12, 14], notes: [0, 0, 7, 5, 0, 0, 5, 7] },  // walking 8ths
    { steps: [0, 2, 4, 6, 8, 10, 12, 14], notes: [0, 7, 0, 5, 0, 7, 12, 7] },
  ],
];

export class PopPunkStyle extends BaseMusicStyle {
  private synths: PopPunkSynths;
  private progression: number[];
  private chordIndex = 0;
  private kickPattern: number[];
  private snarePattern: number[];
  private hatPattern: number[];
  private strumPattern: number[];
  private leadPattern: { steps: number[]; notes: number[] };
  private bassPattern: { steps: number[]; notes: number[] };
  private inChorus = false;

  constructor(ctx: AudioContext, output: GainNode) {
    super(ctx, BPM);
    this.synths = new PopPunkSynths(ctx, output);
    this.intensity = 0.5;
    this.progression = pick(PROGRESSIONS);
    this.kickPattern = pick(KICK_POOLS[0]);
    this.snarePattern = pick(SNARE_POOLS[0]);
    this.hatPattern = pick(HAT_POOLS[0]);
    this.strumPattern = pick(STRUM_POOLS[0]);
    this.leadPattern = pick(LEAD_POOLS[0]);
    this.bassPattern = pick(BASS_POOLS[0]);
  }

  highlight(): void {
    this.highlightBarsLeft = 4;
    // Highlight = big chorus moment
    this.inChorus = true;
    this.kickPattern = pick(KICK_POOLS[3]);
    this.snarePattern = pick(SNARE_POOLS[3]);
    this.hatPattern = pick(HAT_POOLS[3]);
    this.strumPattern = pick(STRUM_POOLS[3]);
    this.leadPattern = pick(LEAD_POOLS[3]);
    this.bassPattern = pick(BASS_POOLS[3]);
  }

  protected stopSynths(): void {
    this.synths.stopAll();
  }

  protected onBarEnd(): void {
    this.chordIndex = (this.chordIndex + 1) % this.progression.length;

    // Song structure: verse (4 bars) → chorus (4 bars)
    if (this.highlightBarsLeft <= 0) {
      this.inChorus = this.barCount % 8 >= 4;
    }

    const refreshChance = 0.15 + this.intensity * 0.35;
    if (this.highlightBarsLeft <= 0 && this.barCount % 2 === 0 && Math.random() < refreshChance) {
      const t = this.tier();
      // Chorus uses higher tier patterns
      const ct = this.inChorus ? Math.min(3, t + 1) : t;
      this.kickPattern = pick(KICK_POOLS[ct]);
      this.snarePattern = pick(SNARE_POOLS[ct]);
      this.hatPattern = pick(HAT_POOLS[ct]);
      this.strumPattern = pick(STRUM_POOLS[ct]);
      this.leadPattern = pick(LEAD_POOLS[ct]);
      this.bassPattern = pick(BASS_POOLS[ct]);
    }

    // New progression occasionally
    if (this.barCount % 16 === 0 && Math.random() < 0.4) {
      this.progression = pick(PROGRESSIONS);
    }
  }

  protected playStep(step: number, time: number): void {
    const barDuration = this.stepDuration * STEPS_PER_BAR;
    const int = this.intensity;
    const hl = this.highlightBarsLeft > 0;
    const root = this.progression[this.chordIndex];

    // --- Drums ---
    if (this.kickPattern.includes(step)) this.synths.kick(time);
    if (this.snarePattern.includes(step)) this.synths.snare(time);
    if (this.hatPattern.includes(step)) {
      this.synths.hihat(time, step % 2 === 1 ? 0.025 : 0.04);
    }

    // Crash on chorus entries and every 4 bars
    if (step === 0 && (this.barCount % 4 === 0 || (this.inChorus && this.barCount % 8 === 4))) {
      this.synths.crash(time);
    }

    // --- Guitar strumming ---
    const strumDiv = 2; // 8th note resolution
    if (step % strumDiv === 0) {
      const strumIdx = (step / strumDiv) % this.strumPattern.length;
      const hit = this.strumPattern[strumIdx];
      if (hit === 0) {
        this.synths.powerChord(time, root, this.stepDuration * strumDiv * 0.9);
      } else if (hit === 1) {
        this.synths.palmMute(time, root, this.stepDuration * strumDiv * 0.7);
      }
    }

    // --- Octave lead melody — always present, more complex at higher tiers ---
    const leadIdx = this.leadPattern.steps.indexOf(step);
    if (leadIdx >= 0) {
      const note = root + 12 + this.leadPattern.notes[leadIdx];
      const dur = this.stepDuration * (int > 0.5 ? 1.8 : 2.5);
      this.synths.octaveLead(time, note, dur);
    }

    // --- Bass ---
    const bassIdx = this.bassPattern.steps.indexOf(step);
    if (bassIdx >= 0) {
      const note = root - 12 + this.bassPattern.notes[bassIdx];
      this.synths.bass(time, note, this.stepDuration * 1.8);
    }

    // --- Chorus extras: double the lead an octave up ---
    if ((this.inChorus || hl) && leadIdx >= 0) {
      const note = root + 24 + this.leadPattern.notes[leadIdx];
      this.synths.octaveLead(time, note, this.stepDuration * 1.5);
    }

    // --- Highlight extras ---
    if (hl) {
      if (step === 0) {
        this.synths.crash(time);
      }
      if (step === 14 || step === 15) {
        this.synths.snare(time);
      }
      // Fill in lead gaps with extra melody notes
      if (leadIdx < 0 && step % 2 === 0 && Math.random() < 0.35) {
        const intervals = [0, 2, 4, 5, 7, 11, 12];
        const note = root + 12 + pick(intervals);
        this.synths.octaveLead(time, note, this.stepDuration * 1.5);
      }
    }
  }
}
