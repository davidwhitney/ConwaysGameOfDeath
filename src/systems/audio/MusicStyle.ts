/** Interface for pluggable music styles. */
export interface MusicStyle {
  start(): void;
  stop(): void;
}

export type MusicStyleFactory = (ctx: AudioContext, output: GainNode) => MusicStyle;
