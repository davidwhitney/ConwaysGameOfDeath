/** Pool of 4-chord progression patterns as semitone offsets from tonic. */
const PROG_PATTERNS: number[][] = [
  [0, 5, 7, 3],  // i - iv - v - III
  [0, 3, 5, 7],  // i - III - iv - v
  [0, 7, 5, 3],  // i - v - iv - III (descending)
  [0, 5, 3, 7],  // i - iv - III - v
  [0, 0, 5, 5],  // i - i - iv - iv (hypnotic)
  [0, 3, 0, 5],  // i - III - i - iv (chill)
];

const MINOR_DEGREES = new Set([0, 2, 5, 7, 9]);

export class LofiTheory {
  private tonic: number;

  constructor() {
    // C3–F3 (MIDI 48–53) — warm range for pads
    this.tonic = 48 + Math.floor(Math.random() * 6);
  }

  private buildChord(rootOffset: number): number[] {
    const root = this.tonic + rootOffset;
    if (MINOR_DEGREES.has(rootOffset % 12)) {
      return [root, root + 3, root + 7, root + 10]; // m7
    }
    return [root, root + 4, root + 7, root + 11]; // maj7
  }

  generateProgression(): number[][] {
    const pattern = PROG_PATTERNS[Math.floor(Math.random() * PROG_PATTERNS.length)];
    return pattern.map(offset => this.buildChord(offset));
  }
}
