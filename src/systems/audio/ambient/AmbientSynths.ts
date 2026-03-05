function mtof(n: number): number {
  return 440 * Math.pow(2, (n - 69) / 12);
}

export class AmbientSynths {
  private ctx: AudioContext;
  readonly masterFilter: BiquadFilterNode;
  private activePadOscs: OscillatorNode[] = [];
  private activePadGains: GainNode[] = [];

  constructor(ctx: AudioContext, output: AudioNode) {
    this.ctx = ctx;
    this.masterFilter = ctx.createBiquadFilter();
    this.masterFilter.type = 'lowpass';
    this.masterFilter.frequency.value = 4000;
    this.masterFilter.Q.value = 0.5;
    this.masterFilter.connect(output);
  }

  kick(time: number): void {
    // Soft sine, no click
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(80, time);
    osc.frequency.exponentialRampToValueAtTime(30, time + 0.2);
    gain.gain.setValueAtTime(0, time);
    gain.gain.linearRampToValueAtTime(0.4, time + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.4);
    osc.connect(gain).connect(this.masterFilter);
    osc.start(time);
    osc.stop(time + 0.4);
  }

  shaker(time: number, duration = 0.08): void {
    const bufLen = Math.floor(this.ctx.sampleRate * duration);
    const buf = this.ctx.createBuffer(1, bufLen, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < bufLen; i++) data[i] = Math.random() * 2 - 1;

    const noise = this.ctx.createBufferSource();
    noise.buffer = buf;
    const bp = this.ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = 6000;
    bp.Q.value = 1;
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.04, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + duration);
    noise.connect(bp).connect(gain).connect(this.masterFilter);
    noise.start(time);
    noise.stop(time + duration);
  }

  bell(time: number, note: number, duration: number): void {
    const freq = mtof(note);

    // FM bell: carrier + harmonics at x2 and x3
    const harmonics = [1, 2, 3];
    const volumes = [0.08, 0.04, 0.02];

    for (let h = 0; h < harmonics.length; h++) {
      const osc = this.ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = freq * harmonics[h];

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(volumes[h], time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + duration);

      osc.connect(gain).connect(this.masterFilter);
      osc.start(time);
      osc.stop(time + duration + 0.01);
    }
  }

  pad(time: number, notes: number[], duration: number, bright = false): void {
    for (const note of notes) {
      const freq = mtof(note);
      for (const detune of [-7, 0, 7]) {
        const osc = this.ctx.createOscillator();
        osc.type = 'triangle';
        osc.frequency.value = freq;
        osc.detune.value = detune;

        const lp = this.ctx.createBiquadFilter();
        lp.type = 'lowpass';
        lp.frequency.value = bright ? 2500 : 1200;
        lp.Q.value = 0.3;

        const gain = this.ctx.createGain();
        // Very slow attack and release
        const attack = Math.min(1.5, duration * 0.3);
        const release = Math.min(1.0, duration * 0.25);
        gain.gain.setValueAtTime(0, time);
        gain.gain.linearRampToValueAtTime(0.025, time + attack);
        gain.gain.setValueAtTime(0.025, time + duration - release);
        gain.gain.linearRampToValueAtTime(0, time + duration);

        osc.connect(lp).connect(gain).connect(this.masterFilter);
        osc.start(time);
        osc.stop(time + duration + 0.01);
      }
    }
  }

  sub(time: number, note: number, duration: number): void {
    const freq = mtof(note);
    const osc = this.ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = freq;

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0, time);
    gain.gain.linearRampToValueAtTime(0.15, time + 0.1);
    gain.gain.setValueAtTime(0.15, time + duration * 0.7);
    gain.gain.linearRampToValueAtTime(0, time + duration);

    osc.connect(gain).connect(this.masterFilter);
    osc.start(time);
    osc.stop(time + duration + 0.01);
  }

  stopAll(): void {
    for (const osc of this.activePadOscs) {
      try { osc.stop(); } catch { /* already stopped */ }
    }
    this.activePadOscs = [];
    this.activePadGains = [];
    this.masterFilter.disconnect();
  }
}
