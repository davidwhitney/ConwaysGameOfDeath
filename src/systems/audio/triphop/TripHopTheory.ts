/**
 * Dark trip-hop chord progressions — Massive Attack inspired.
 * Heavy on minor, suspended, and diminished voicings.
 */

/** 4-chord progression patterns as semitone offsets from tonic. */
const PROG_PATTERNS: number[][] = [
  [0, 0, 5, 5],    // i - i - iv - iv (Teardrop-style hypnotic)
  [0, 0, 3, 5],    // i - i - III - iv (slow build)
  [0, 5, 0, 7],    // i - iv - i - v (Angel-style tension)
  [0, 7, 5, 0],    // i - v - iv - i (descending menace)
  [0, 0, 0, 5],    // i - i - i - iv (minimal, brooding)
  [0, 3, 5, 3],    // i - III - iv - III (circular dread)
];

/** Chord type determined by scale degree. */
const enum ChordType { Minor, Sus2, Dim, MinAdd9 }

function chordTypeFor(offset: number): ChordType {
  const deg = ((offset % 12) + 12) % 12;
  if (deg === 5 || deg === 7) return ChordType.Sus2;
  if (deg === 3) return ChordType.MinAdd9;
  return ChordType.Minor;
}

export class TripHopTheory {
  private tonic: number;

  constructor() {
    // D2–G2 (MIDI 38–43) — low and threatening
    this.tonic = 38 + Math.floor(Math.random() * 6);
  }

  getTonic(): number { return this.tonic; }

  private buildChord(rootOffset: number): number[] {
    const root = this.tonic + rootOffset;
    switch (chordTypeFor(rootOffset)) {
      case ChordType.Sus2:
        return [root, root + 2, root + 7, root + 12];
      case ChordType.MinAdd9:
        return [root, root + 3, root + 7, root + 14];
      case ChordType.Dim:
        return [root, root + 3, root + 6, root + 10];
      case ChordType.Minor:
      default:
        return [root, root + 3, root + 7, root + 10];
    }
  }

  generateProgression(): number[][] {
    const pattern = PROG_PATTERNS[Math.floor(Math.random() * PROG_PATTERNS.length)];
    return pattern.map(offset => this.buildChord(offset));
  }
}
