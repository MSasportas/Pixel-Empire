// =====================================================================
//  PIXEL EMPIRE - MUSIC AND SOUNDS
//  ---------------------------------------------------------------------
//  The synthwave music is made by the computer itself, note by note,
//  with the browser's built-in sound maker (Web Audio). No music files
//  are needed, so there is nothing to buy or license.
// =====================================================================

const Sound = {
  ctx: null,
  master: null,
  musicGain: null,
  sfxGain: null,
  musicOn: true,
  soundsOn: true,
  playing: false,
  nextBeat: 0,
  beat: 0,
  timer: null,

  // Browsers only allow sound after the player clicks something.
  start() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      this.ctx = new AudioCtx();
      this.master = this.ctx.createGain(); this.master.gain.value = 0.5; this.master.connect(this.ctx.destination);
      this.musicGain = this.ctx.createGain(); this.musicGain.gain.value = this.musicOn ? 0.35 : 0; this.musicGain.connect(this.master);
      this.sfxGain = this.ctx.createGain(); this.sfxGain.gain.value = this.soundsOn ? 0.6 : 0; this.sfxGain.connect(this.master);
    }
    if (this.ctx.state === "suspended") this.ctx.resume();
    if (!this.playing) {
      this.playing = true;
      this.nextBeat = this.ctx.currentTime + 0.1;
      this.timer = setInterval(() => this.schedule(), 100);
    }
  },

  setMusic(on) {
    this.musicOn = on;
    if (this.musicGain) this.musicGain.gain.value = on ? 0.35 : 0;
  },

  setSounds(on) {
    this.soundsOn = on;
    if (this.sfxGain) this.sfxGain.gain.value = on ? 0.6 : 0;
  },

  // ----- The song ---------------------------------------------------
  // Four chords that repeat: A minor, F, C, G. Each lasts 2 bars.
  bpm: 96,
  chords: [
    [57, 60, 64], // A minor
    [53, 57, 60], // F
    [48, 52, 55], // C
    [55, 59, 62], // G
  ],

  freq(note) { return 440 * Math.pow(2, (note - 69) / 12); },

  // Plans the next few notes a little ahead of time, so they play on beat.
  schedule() {
    const sixteenth = 60 / this.bpm / 4;
    while (this.nextBeat < this.ctx.currentTime + 0.3) {
      this.playStep(this.beat, this.nextBeat, sixteenth);
      this.nextBeat += sixteenth;
      this.beat = (this.beat + 1) % (16 * 8); // 8 bars, then repeat
    }
  },

  playStep(b, time, len) {
    const chord = this.chords[Math.floor(b / 32) % 4];
    const inBar = b % 16;
    // Pad: soft long chord at the start of each 2 bars
    if (b % 32 === 0) for (const n of chord) this.note(this.musicGain, "sawtooth", this.freq(n), time, len * 32, 0.05, 900);
    // Bass: pulsing eighth notes
    if (b % 2 === 0) this.note(this.musicGain, "square", this.freq(chord[0] - 24), time, len * 1.6, 0.09, 500);
    // Arpeggio: the chord's notes going up and down
    const arp = [0, 1, 2, 1];
    if (b >= 32 && b % 2 === 0) this.note(this.musicGain, "triangle", this.freq(chord[arp[(b / 2) % 4]] + 12), time, len * 1.5, 0.07, 3000);
    // Drums: kick on 1 and 3, snare on 2 and 4, hi-hat on off-beats
    if (inBar === 0 || inBar === 8) this.kick(time);
    if (inBar === 4 || inBar === 12) this.noise(time, 0.15, 0.12, 1500);
    if (b % 2 === 1) this.noise(time, 0.03, 0.03, 8000);
  },

  // One note: a wave shape, a pitch, when, how long, how loud, how bright.
  note(out, type, freq, time, dur, vol, bright) {
    const c = this.ctx;
    const osc = c.createOscillator(), gain = c.createGain(), filter = c.createBiquadFilter();
    osc.type = type; osc.frequency.value = freq;
    filter.type = "lowpass"; filter.frequency.value = bright;
    gain.gain.setValueAtTime(0, time);
    gain.gain.linearRampToValueAtTime(vol, time + Math.min(0.02, dur / 4));
    gain.gain.exponentialRampToValueAtTime(0.0001, time + dur);
    osc.connect(filter); filter.connect(gain); gain.connect(out);
    osc.start(time); osc.stop(time + dur + 0.05);
  },

  kick(time) {
    const c = this.ctx;
    const osc = c.createOscillator(), gain = c.createGain();
    osc.frequency.setValueAtTime(140, time);
    osc.frequency.exponentialRampToValueAtTime(40, time + 0.15);
    gain.gain.setValueAtTime(0.3, time);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.2);
    osc.connect(gain); gain.connect(this.musicGain);
    osc.start(time); osc.stop(time + 0.25);
  },

  noise(time, dur, vol, cutoff) {
    const c = this.ctx;
    if (!this.noiseBuffer) {
      this.noiseBuffer = c.createBuffer(1, c.sampleRate * 0.5, c.sampleRate);
      const data = this.noiseBuffer.getChannelData(0);
      for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    }
    const src = c.createBufferSource(), gain = c.createGain(), filter = c.createBiquadFilter();
    src.buffer = this.noiseBuffer;
    filter.type = "highpass"; filter.frequency.value = cutoff;
    gain.gain.setValueAtTime(vol, time);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + dur);
    src.connect(filter); filter.connect(gain); gain.connect(this.musicGain);
    src.start(time); src.stop(time + dur + 0.05);
  },

  // ----- Sound effects ----------------------------------------------
  play(name) {
    if (!this.ctx || !this.soundsOn) return;
    const t = this.ctx.currentTime;
    const out = this.sfxGain;
    if (name === "click") this.note(out, "square", 880, t, 0.06, 0.08, 4000);
    if (name === "buy") { this.note(out, "square", 988, t, 0.08, 0.1, 5000); this.note(out, "square", 1319, t + 0.08, 0.15, 0.1, 5000); }
    if (name === "nope") this.note(out, "sawtooth", 160, t, 0.15, 0.08, 1200);
    if (name === "hit") this.note(out, "triangle", 1200 + Math.random() * 400, t, 0.08, 0.15, 6000);
    if (name === "step") { this.note(out, "triangle", 660, t, 0.1, 0.1, 4000); this.note(out, "triangle", 880, t + 0.1, 0.15, 0.1, 4000); }
    if (name === "launch") {
      [60, 64, 67, 72, 76, 79, 84].forEach((n, i) => this.note(out, "square", this.freq(n + 12), t + i * 0.07, 0.3, 0.08, 5000));
    }
    if (name === "level") {
      [72, 76, 79, 84].forEach((n, i) => this.note(out, "sawtooth", this.freq(n), t + i * 0.15, 0.5, 0.07, 3000));
    }
  },
};
