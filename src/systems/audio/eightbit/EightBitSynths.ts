function mtof(note: number): number {
  return 440 * Math.pow(2, (note - 69) / 12);
}

export class EightBitSynths {
  private ctx: AudioContext;
  readonly masterFilter: BiquadFilterNode;

  constructor(ctx: AudioContext, output: AudioNode) {
    this.ctx = ctx;
    // Slightly lo-fi filtering to tame harsh square waves
    this.masterFilter = ctx.createBiquadFilter();
    this.masterFilter.type = 'lowpass';
    this.masterFilter.frequency.value = 6000;
    this.masterFilter.Q.value = 0.5;
    this.masterFilter.connect(output);
  }

  /** Chiptune kick — short pitch sweep square wave. */
  kick(time: number): void {
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(200, time);
    osc.frequency.exponentialRampToValueAtTime(40, time + 0.06);
    gain.gain.setValueAtTime(0.5, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.15);
    osc.connect(gain).connect(this.masterFilter);
    osc.start(time);
    osc.stop(time + 0.15);
  }

  /** Chiptune snare — noise burst, short and clipped. */
  snare(time: number): void {
    const bufLen = Math.floor(this.ctx.sampleRate * 0.08);
    const buf = this.ctx.createBuffer(1, bufLen, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    // 1-bit style noise
    for (let i = 0; i < bufLen; i++) data[i] = Math.random() > 0.5 ? 0.5 : -0.5;

    const noise = this.ctx.createBufferSource();
    noise.buffer = buf;
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.35, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.08);
    noise.connect(gain).connect(this.masterFilter);
    noise.start(time);
    noise.stop(time + 0.08);
  }

  /** 8-bit hi-hat — very short noise. */
  hihat(time: number): void {
    const bufLen = Math.floor(this.ctx.sampleRate * 0.02);
    const buf = this.ctx.createBuffer(1, bufLen, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < bufLen; i++) data[i] = Math.random() > 0.5 ? 0.3 : -0.3;
    const noise = this.ctx.createBufferSource();
    noise.buffer = buf;
    const hp = this.ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = 6000;
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.2, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.02);
    noise.connect(hp).connect(gain).connect(this.masterFilter);
    noise.start(time);
    noise.stop(time + 0.025);
  }

  /** Power chord "guitar" — two square waves (root + fifth). */
  powerChord(time: number, note: number, duration: number): void {
    for (const offset of [0, 7]) {
      const osc = this.ctx.createOscillator();
      osc.type = 'square';
      osc.frequency.value = mtof(note + offset);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.08, time);
      gain.gain.setValueAtTime(0.08, time + duration * 0.7);
      gain.gain.linearRampToValueAtTime(0, time + duration);

      osc.connect(gain).connect(this.masterFilter);
      osc.start(time);
      osc.stop(time + duration + 0.01);
    }
  }

  /** Lead shred note — pulse wave with vibrato. */
  lead(time: number, note: number, duration: number): void {
    const osc = this.ctx.createOscillator();
    osc.type = 'square';
    osc.frequency.value = mtof(note);

    // Vibrato
    const lfo = this.ctx.createOscillator();
    const lfoGain = this.ctx.createGain();
    lfo.frequency.value = 6;
    lfoGain.gain.value = 8;
    lfo.connect(lfoGain).connect(osc.frequency);
    lfo.start(time);
    lfo.stop(time + duration + 0.01);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.1, time);
    gain.gain.setValueAtTime(0.1, time + duration * 0.6);
    gain.gain.linearRampToValueAtTime(0, time + duration);

    osc.connect(gain).connect(this.masterFilter);
    osc.start(time);
    osc.stop(time + duration + 0.01);
  }

  /** Bass — triangle wave, NES-style. */
  bass(time: number, note: number, duration: number): void {
    const osc = this.ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.value = mtof(note);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.2, time);
    gain.gain.setValueAtTime(0.2, time + duration * 0.7);
    gain.gain.linearRampToValueAtTime(0, time + duration);

    osc.connect(gain).connect(this.masterFilter);
    osc.start(time);
    osc.stop(time + duration + 0.01);
  }

  stopAll(): void {
    this.masterFilter.disconnect();
  }
}
