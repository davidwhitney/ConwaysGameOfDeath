function mtof(n: number): number {
  return 440 * Math.pow(2, (n - 69) / 12);
}

export class PopPunkSynths {
  private ctx: AudioContext;
  readonly masterFilter: BiquadFilterNode;

  constructor(ctx: AudioContext, output: AudioNode) {
    this.ctx = ctx;
    this.masterFilter = ctx.createBiquadFilter();
    this.masterFilter.type = 'lowpass';
    this.masterFilter.frequency.value = 6000;
    this.masterFilter.Q.value = 0.6;
    this.masterFilter.connect(output);
  }

  kick(time: number): void {
    // Tight, punchy pop-punk kick
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(160, time);
    osc.frequency.exponentialRampToValueAtTime(40, time + 0.07);
    gain.gain.setValueAtTime(0.7, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.15);
    osc.connect(gain).connect(this.masterFilter);
    osc.start(time);
    osc.stop(time + 0.15);

    // Click
    const click = this.ctx.createOscillator();
    const cGain = this.ctx.createGain();
    click.type = 'square';
    click.frequency.setValueAtTime(500, time);
    click.frequency.exponentialRampToValueAtTime(80, time + 0.01);
    cGain.gain.setValueAtTime(0.25, time);
    cGain.gain.exponentialRampToValueAtTime(0.001, time + 0.02);
    click.connect(cGain).connect(this.masterFilter);
    click.start(time);
    click.stop(time + 0.02);
  }

  snare(time: number): void {
    // Bright, cracking pop-punk snare
    const bufLen = Math.floor(this.ctx.sampleRate * 0.12);
    const buf = this.ctx.createBuffer(1, bufLen, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < bufLen; i++) data[i] = Math.random() * 2 - 1;

    const noise = this.ctx.createBufferSource();
    noise.buffer = buf;
    const hp = this.ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = 2500;
    const nGain = this.ctx.createGain();
    nGain.gain.setValueAtTime(0.3, time);
    nGain.gain.exponentialRampToValueAtTime(0.001, time + 0.1);
    noise.connect(hp).connect(nGain).connect(this.masterFilter);
    noise.start(time);
    noise.stop(time + 0.12);

    const body = this.ctx.createOscillator();
    const bGain = this.ctx.createGain();
    body.type = 'triangle';
    body.frequency.setValueAtTime(200, time);
    body.frequency.exponentialRampToValueAtTime(100, time + 0.04);
    bGain.gain.setValueAtTime(0.35, time);
    bGain.gain.exponentialRampToValueAtTime(0.001, time + 0.07);
    body.connect(bGain).connect(this.masterFilter);
    body.start(time);
    body.stop(time + 0.07);
  }

  hihat(time: number, duration = 0.04): void {
    const bufLen = Math.floor(this.ctx.sampleRate * duration);
    const buf = this.ctx.createBuffer(1, bufLen, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < bufLen; i++) data[i] = Math.random() * 2 - 1;

    const noise = this.ctx.createBufferSource();
    noise.buffer = buf;
    const hp = this.ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = 8000;
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.1, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + duration);
    noise.connect(hp).connect(gain).connect(this.masterFilter);
    noise.start(time);
    noise.stop(time + duration);
  }

  crash(time: number): void {
    const bufLen = Math.floor(this.ctx.sampleRate * 0.35);
    const buf = this.ctx.createBuffer(1, bufLen, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < bufLen; i++) data[i] = Math.random() * 2 - 1;

    const noise = this.ctx.createBufferSource();
    noise.buffer = buf;
    const bp = this.ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = 5000;
    bp.Q.value = 0.4;
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.12, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.35);
    noise.connect(bp).connect(gain).connect(this.masterFilter);
    noise.start(time);
    noise.stop(time + 0.35);
  }

  powerChord(time: number, note: number, duration: number): void {
    // Bright, crunchy power chord — medium gain, not too heavy
    const freq = mtof(note);
    const intervals = [0, 7, 12];
    for (const interval of intervals) {
      const f = freq * Math.pow(2, interval / 12);
      for (const detune of [-8, 0, 8]) {
        const osc = this.ctx.createOscillator();
        osc.type = 'sawtooth';
        osc.frequency.value = f;
        osc.detune.value = detune;

        const shaper = this.ctx.createWaveShaper();
        const curve = new Float32Array(256);
        for (let i = 0; i < 256; i++) {
          const x = (i / 128) - 1;
          curve[i] = Math.tanh(x * 8);
        }
        shaper.curve = curve;

        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0, time);
        gain.gain.linearRampToValueAtTime(0.02, time + 0.004);
        gain.gain.setValueAtTime(0.02, time + duration * 0.75);
        gain.gain.linearRampToValueAtTime(0, time + duration);

        osc.connect(shaper).connect(gain).connect(this.masterFilter);
        osc.start(time);
        osc.stop(time + duration + 0.01);
      }
    }
  }

  palmMute(time: number, note: number, duration: number): void {
    // Tight palm-muted chug
    const freq = mtof(note);
    for (const detune of [-6, 0, 6]) {
      const osc = this.ctx.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.value = freq;
      osc.detune.value = detune;

      const shaper = this.ctx.createWaveShaper();
      const curve = new Float32Array(256);
      for (let i = 0; i < 256; i++) {
        const x = (i / 128) - 1;
        curve[i] = Math.tanh(x * 8);
      }
      shaper.curve = curve;

      const lp = this.ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = 2000;
      lp.Q.value = 1;

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0, time);
      gain.gain.linearRampToValueAtTime(0.03, time + 0.003);
      gain.gain.exponentialRampToValueAtTime(0.001, time + duration);

      osc.connect(shaper).connect(lp).connect(gain).connect(this.masterFilter);
      osc.start(time);
      osc.stop(time + duration + 0.01);
    }
  }

  bass(time: number, note: number, duration: number): void {
    // Punchy pick-style bass
    const freq = mtof(note);

    const osc = this.ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.value = freq;

    const lp = this.ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(1800, time);
    lp.frequency.exponentialRampToValueAtTime(600, time + 0.06);
    lp.Q.value = 2;

    const shaper = this.ctx.createWaveShaper();
    const curve = new Float32Array(256);
    for (let i = 0; i < 256; i++) {
      const x = (i / 128) - 1;
      curve[i] = Math.tanh(x * 4);
    }
    shaper.curve = curve;

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0, time);
    gain.gain.linearRampToValueAtTime(0.25, time + 0.008);
    gain.gain.setValueAtTime(0.25, time + duration * 0.65);
    gain.gain.linearRampToValueAtTime(0, time + duration);

    osc.connect(shaper).connect(lp).connect(gain).connect(this.masterFilter);
    osc.start(time);
    osc.stop(time + duration + 0.01);
  }

  octaveLead(time: number, note: number, duration: number): void {
    // Catchy octave lead — root + octave, bright and melodic
    const freq = mtof(note);
    for (const mult of [1, 2]) {
      const osc = this.ctx.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.value = freq * mult;

      const shaper = this.ctx.createWaveShaper();
      const curve = new Float32Array(256);
      for (let i = 0; i < 256; i++) {
        const x = (i / 128) - 1;
        curve[i] = Math.tanh(x * 6);
      }
      shaper.curve = curve;

      const lp = this.ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = 4500;
      lp.Q.value = 0.8;

      const gain = this.ctx.createGain();
      const vol = mult === 1 ? 0.04 : 0.03;
      gain.gain.setValueAtTime(0, time);
      gain.gain.linearRampToValueAtTime(vol, time + 0.005);
      gain.gain.setValueAtTime(vol, time + duration * 0.7);
      gain.gain.linearRampToValueAtTime(0, time + duration);

      osc.connect(shaper).connect(lp).connect(gain).connect(this.masterFilter);
      osc.start(time);
      osc.stop(time + duration + 0.01);
    }
  }

  stopAll(): void {
    this.masterFilter.disconnect();
  }
}
