function mtof(note: number): number {
  return 440 * Math.pow(2, (note - 69) / 12);
}

export class TechnoSynths {
  private ctx: AudioContext;
  readonly masterFilter: BiquadFilterNode;

  constructor(ctx: AudioContext, output: AudioNode) {
    this.ctx = ctx;
    this.masterFilter = ctx.createBiquadFilter();
    this.masterFilter.type = 'lowpass';
    this.masterFilter.frequency.value = 8000;
    this.masterFilter.Q.value = 0.5;
    this.masterFilter.connect(output);
  }

  /** Classic 909-style kick — punchy with sub tail. */
  kick(time: number): void {
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(160, time);
    osc.frequency.exponentialRampToValueAtTime(38, time + 0.08);
    gain.gain.setValueAtTime(0.85, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.3);
    osc.connect(gain).connect(this.masterFilter);
    osc.start(time);
    osc.stop(time + 0.3);
  }

  /** Clap — layered noise bursts. */
  clap(time: number): void {
    for (let n = 0; n < 3; n++) {
      const t = time + n * 0.01;
      const bufLen = Math.floor(this.ctx.sampleRate * 0.04);
      const buf = this.ctx.createBuffer(1, bufLen, this.ctx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < bufLen; i++) data[i] = Math.random() * 2 - 1;
      const noise = this.ctx.createBufferSource();
      noise.buffer = buf;
      const bp = this.ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.value = 2500;
      bp.Q.value = 1.5;
      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.25, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.08);
      noise.connect(bp).connect(gain).connect(this.masterFilter);
      noise.start(t);
      noise.stop(t + 0.08);
    }
  }

  /** Closed hi-hat — tight and crisp. */
  hihat(time: number, open = false): void {
    const duration = open ? 0.12 : 0.03;
    const bufLen = Math.floor(this.ctx.sampleRate * duration);
    const buf = this.ctx.createBuffer(1, bufLen, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < bufLen; i++) data[i] = Math.random() * 2 - 1;
    const noise = this.ctx.createBufferSource();
    noise.buffer = buf;
    const hp = this.ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = 7000;
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(open ? 0.1 : 0.14, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + duration);
    noise.connect(hp).connect(gain).connect(this.masterFilter);
    noise.start(time);
    noise.stop(time + duration);
  }

  /** Acid bass — saw through resonant filter with envelope. */
  acidBass(time: number, note: number, duration: number, accent: boolean): void {
    const freq = mtof(note);
    const osc = this.ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.value = freq;

    const lp = this.ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.Q.value = accent ? 12 : 6;
    lp.frequency.setValueAtTime(accent ? 3000 : 1500, time);
    lp.frequency.exponentialRampToValueAtTime(200, time + duration * 0.8);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(accent ? 0.22 : 0.15, time);
    gain.gain.setValueAtTime(accent ? 0.22 : 0.15, time + duration * 0.6);
    gain.gain.linearRampToValueAtTime(0, time + duration);

    osc.connect(lp).connect(gain).connect(this.masterFilter);
    osc.start(time);
    osc.stop(time + duration + 0.01);
  }

  /** Atmospheric pad — filtered triangle waves. */
  pad(time: number, notes: number[], duration: number): void {
    for (const note of notes) {
      const osc = this.ctx.createOscillator();
      osc.type = 'triangle';
      osc.frequency.value = mtof(note);
      const lp = this.ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = 1500;
      const gain = this.ctx.createGain();
      const att = Math.min(1.0, duration * 0.3);
      gain.gain.setValueAtTime(0, time);
      gain.gain.linearRampToValueAtTime(0.03, time + att);
      gain.gain.setValueAtTime(0.03, time + duration - 0.5);
      gain.gain.linearRampToValueAtTime(0, time + duration);
      osc.connect(lp).connect(gain).connect(this.masterFilter);
      osc.start(time);
      osc.stop(time + duration + 0.01);
    }
  }

  stopAll(): void {
    this.masterFilter.disconnect();
  }
}
