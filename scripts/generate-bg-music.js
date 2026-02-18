/**
 * generate-bg-music.js
 * Generates a 30-second synthetic background music WAV for the social video.
 * Cinematic, minimal, dark ambient — matches the voiceover timing.
 *
 * Structure (matches SS timing at 30fps):
 *   0–5s   (frames 0–150):   Scene 1 — sparse, low drone, tension build
 *   5–14s  (frames 150–420): Scene 2 — heavier pulse, minor chord stabs
 *   14–24s (frames 420–720): Scene 3 — hopeful rise, arpeggiated synth
 *   24–30s (frames 720–900): Scene 4 — resolving swell, fade to silence
 *
 * Usage: node scripts/generate-bg-music.js
 * Output: public/audio/bg-social.wav
 */

const fs = require('fs');
const path = require('path');

const SAMPLE_RATE = 44100;
const DURATION    = 30;
const NUM_SAMPLES = SAMPLE_RATE * DURATION;
const CHANNELS    = 2;

// ── Helpers ──────────────────────────────────────────────────────────────────

function noteToHz(note) {
  // note: e.g. 'A3', 'C#4', 'Bb2'
  const notes = { C:0, 'C#':1, Db:1, D:2, 'D#':3, Eb:3, E:4, F:5, 'F#':6, Gb:6, G:7, 'G#':8, Ab:8, A:9, 'A#':10, Bb:10, B:11 };
  const match = note.match(/^([A-G]#?b?)(\d)$/);
  if (!match) return 440;
  const semitone = notes[match[1]] ?? 0;
  const octave   = parseInt(match[2]);
  return 440 * Math.pow(2, (semitone - 9 + (octave - 4) * 12) / 12);
}

function sine(t, freq, phase = 0) {
  return Math.sin(2 * Math.PI * freq * t + phase);
}

function saw(t, freq) {
  return 2 * ((t * freq) % 1) - 1;
}

function env(t, attack, decay, sustain, release, duration) {
  if (t < attack)                          return t / attack;
  if (t < attack + decay)                  return 1 - (1 - sustain) * (t - attack) / decay;
  if (t < duration - release)              return sustain;
  if (t < duration)                        return sustain * (1 - (t - (duration - release)) / release);
  return 0;
}

function lerp(a, b, t) { return a + (b - a) * Math.clamp(t, 0, 1); }
Math.clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

// ── Scene timing ─────────────────────────────────────────────────────────────
const T = {
  s1: { start: 0,  end: 5  },
  s2: { start: 5,  end: 14 },
  s3: { start: 14, end: 24 },
  s4: { start: 24, end: 30 },
};

// ── Synth voices ─────────────────────────────────────────────────────────────

function drone(t, freq, amp) {
  // Slow detuned pad
  return amp * (
    0.5 * sine(t, freq, 0) +
    0.3 * sine(t, freq * 1.003, 0.4) +
    0.2 * sine(t, freq * 0.997, 1.1)
  );
}

function pulse(t, freq, amp) {
  // Rhythmic pulse — 2 beats per second
  const beat = Math.max(0, Math.sin(2 * Math.PI * 2 * t));
  return amp * beat * sine(t, freq);
}

function arp(t, notes, bpm, amp) {
  // Arpeggiated notes at bpm
  const beatDur = 60 / bpm;
  const idx     = Math.floor(t / beatDur) % notes.length;
  const tInBeat = t % beatDur;
  const e       = env(tInBeat, 0.005, 0.05, 0.3, 0.1, beatDur);
  return amp * e * sine(t, noteToHz(notes[idx]));
}

function chord(t, freqs, amp) {
  return amp * freqs.reduce((s, f) => s + sine(t, f) / freqs.length, 0);
}

function kick(t, bpm, amp) {
  const beatDur = 60 / bpm;
  const tInBeat = t % beatDur;
  const freq    = 60 * Math.exp(-tInBeat * 40);
  const e       = Math.exp(-tInBeat * 18);
  return amp * e * sine(tInBeat, freq);
}

// ── Master mix ───────────────────────────────────────────────────────────────

function sample(t) {
  let out = 0;

  // ── Scene 1: 0–5s — sparse tension ──
  if (t >= T.s1.start && t < T.s1.end) {
    const local = t - T.s1.start;
    const dur   = T.s1.end - T.s1.start;
    const fade  = env(local, 1.5, 0.5, 0.8, 1.0, dur);

    // Low drone on A1
    out += fade * drone(t, noteToHz('A1'), 0.18);
    // Sub bass pulse
    out += fade * drone(t, noteToHz('A2'), 0.10);
    // High shimmer
    out += fade * 0.04 * sine(t, noteToHz('E5')) * Math.exp(-local * 0.3);
  }

  // ── Scene 2: 5–14s — chaos, minor stabs ──
  if (t >= T.s2.start && t < T.s2.end) {
    const local = t - T.s2.start;
    const dur   = T.s2.end - T.s2.start;
    const fade  = env(local, 0.8, 0.5, 0.85, 1.2, dur);

    // Heavier drone
    out += fade * drone(t, noteToHz('A1'), 0.22);
    out += fade * drone(t, noteToHz('E2'), 0.12);

    // Rhythmic kick-like pulse at 120bpm
    out += fade * kick(t, 120, 0.14);

    // Minor chord stabs every 2s
    const stabPhase = local % 2.0;
    if (stabPhase < 0.35) {
      const stabEnv = env(stabPhase, 0.02, 0.08, 0.4, 0.15, 0.35);
      out += fade * stabEnv * chord(t, [
        noteToHz('A2'), noteToHz('C3'), noteToHz('E3')
      ], 0.10);
    }

    // Tension rise towards end of scene
    const riseAmt = Math.clamp((local - 6) / 3, 0, 1);
    out += riseAmt * fade * drone(t, noteToHz('A3'), 0.08);
  }

  // ── Scene 3: 14–24s — hopeful, arpeggiated ──
  if (t >= T.s3.start && t < T.s3.end) {
    const local = t - T.s3.start;
    const dur   = T.s3.end - T.s3.start;
    const fade  = env(local, 1.0, 0.5, 0.9, 1.5, dur);

    // Brighter drone — shift to major feel
    out += fade * drone(t, noteToHz('A2'), 0.14);
    out += fade * drone(t, noteToHz('E3'), 0.10);

    // Arpeggio — A minor pentatonic ascending
    const arpStart = 2.0;
    if (local > arpStart) {
      const arpT = local - arpStart;
      out += fade * arp(arpT, ['A3','C4','E4','G4','A4','E4','C4'], 240, 0.09);
    }

    // Soft kick
    out += fade * kick(t, 120, 0.08);

    // Swell chord at frame ~220 (t≈21.3s, local≈7.3s)
    if (local > 7.0) {
      const swellFade = Math.clamp((local - 7.0) / 2.0, 0, 1);
      out += swellFade * fade * chord(t, [
        noteToHz('A3'), noteToHz('C#4'), noteToHz('E4'), noteToHz('A4')
      ], 0.10);
    }
  }

  // ── Scene 4: 24–30s — resolve + fade ──
  if (t >= T.s4.start && t < T.s4.end) {
    const local = t - T.s4.start;
    const dur   = T.s4.end - T.s4.start;
    const fade  = env(local, 0.3, 0.5, 0.85, 2.5, dur);

    // Resolution chord — A major
    out += fade * chord(t, [
      noteToHz('A2'), noteToHz('C#3'), noteToHz('E3'), noteToHz('A3')
    ], 0.14);

    // Drone swell
    out += fade * drone(t, noteToHz('A2'), 0.16);
    out += fade * drone(t, noteToHz('E3'), 0.10);

    // High shimmer
    out += fade * 0.05 * sine(t, noteToHz('A5')) * Math.sin(local * 0.8);
  }

  // ── Global soft limiter ──
  return Math.tanh(out * 1.4) * 0.72;
}

// ── WAV writer ───────────────────────────────────────────────────────────────

function writeWav(filename, samples, sampleRate, channels) {
  const dataLen    = samples.length * 2; // 16-bit
  const headerLen  = 44;
  const buf        = Buffer.alloc(headerLen + dataLen);
  let offset       = 0;

  const w = (v, n) => { buf.writeUInt32LE(v, offset); offset += n; };
  const ws = (s) => { buf.write(s, offset, 'ascii'); offset += s.length; };

  ws('RIFF');
  w(36 + dataLen, 4);
  ws('WAVE');
  ws('fmt ');
  w(16, 4);           // chunk size
  buf.writeUInt16LE(1, offset); offset += 2;  // PCM
  buf.writeUInt16LE(channels, offset); offset += 2;
  w(sampleRate, 4);
  w(sampleRate * channels * 2, 4); // byte rate
  buf.writeUInt16LE(channels * 2, offset); offset += 2; // block align
  buf.writeUInt16LE(16, offset); offset += 2;            // bits per sample
  ws('data');
  w(dataLen, 4);

  for (let i = 0; i < samples.length; i++) {
    const v = Math.max(-1, Math.min(1, samples[i]));
    buf.writeInt16LE(Math.round(v * 32767), offset);
    offset += 2;
  }

  fs.mkdirSync(path.dirname(filename), { recursive: true });
  fs.writeFileSync(filename, buf);
  console.log(`✅ Written: ${filename} (${(buf.length / 1024).toFixed(1)} KB)`);
}

// ── Generate ─────────────────────────────────────────────────────────────────

console.log(`Generating ${DURATION}s synthetic background music @ ${SAMPLE_RATE}Hz...`);

const samples = new Float32Array(NUM_SAMPLES * CHANNELS);

for (let i = 0; i < NUM_SAMPLES; i++) {
  const t = i / SAMPLE_RATE;
  const v = sample(t);
  samples[i * CHANNELS]     = v; // L
  samples[i * CHANNELS + 1] = v; // R (mono → stereo)
}

const outPath = path.join(__dirname, '..', 'public', 'audio', 'bg-social.wav');
writeWav(outPath, samples, SAMPLE_RATE, CHANNELS);
