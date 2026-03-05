/** Interface for pluggable music styles. */
export interface MusicStyle {
  start(): void;
  stop(): void;
  /** Game progression intensity: 0 = calm menu, 1 = peak 30-min gameplay. */
  setIntensity?(intensity: number): void;
  /** Brief complexity flourish triggered by game highlight moments. */
  highlight?(reason: string): void;
}

export type MusicStyleFactory = (ctx: AudioContext, output: GainNode) => MusicStyle;
