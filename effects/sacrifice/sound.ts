import { createSoundPlayer } from "../sound";

export interface SoundChoices {
  /** "synth", "off", or the id of a file in public/sounds */
  scream: string;
  impact: string;
  /** The noises scenes make themselves: falling whistle, lava sizzle, saucer hum */
  sfx: boolean;
  volume: number;
}

/**
 * Sounds for the sacrifice scenes: synthesized, or files from public/sounds for
 * the scream and the impact. Browsers only allow sound after the page has been
 * interacted with; OBS browser sources always allow it.
 */
export function createSounds({ scream, impact, sfx, volume }: SoundChoices) {
  const player = createSoundPlayer();
  let context: AudioContext | null = null;

  const audio = () => {
    context ??= new AudioContext();
    if (context.state === "suspended") context.resume().catch(() => {});
    return context;
  };

  // A falling "aaaah": a sawtooth voice through vowel formants, pitch dropping
  const synthScream = (seconds: number) => {
    const ac = audio();
    const now = ac.currentTime;

    const voice = ac.createOscillator();
    voice.type = "sawtooth";
    voice.frequency.setValueAtTime(520, now);
    voice.frequency.exponentialRampToValueAtTime(900, now + 0.12);
    voice.frequency.exponentialRampToValueAtTime(280, now + seconds);

    const vibrato = ac.createOscillator();
    vibrato.frequency.value = 9;
    const vibratoDepth = ac.createGain();
    vibratoDepth.gain.setValueAtTime(8, now);
    vibratoDepth.gain.linearRampToValueAtTime(40, now + seconds);
    vibrato.connect(vibratoDepth).connect(voice.frequency);

    const out = ac.createGain();
    out.gain.setValueAtTime(0.0001, now);
    out.gain.exponentialRampToValueAtTime(volume, now + 0.06);
    out.gain.setValueAtTime(volume, now + seconds * 0.45);
    // Fades as the figure drops out of sight
    out.gain.exponentialRampToValueAtTime(0.0001, now + seconds);
    out.connect(ac.destination);

    for (const [frequency, gain] of [
      [850, 1],
      [1350, 0.7],
      [2800, 0.35],
    ]) {
      const formant = ac.createBiquadFilter();
      formant.type = "bandpass";
      formant.frequency.value = frequency;
      formant.Q.value = 6;
      const level = ac.createGain();
      level.gain.value = gain;
      voice.connect(formant).connect(level).connect(out);
    }

    voice.start(now);
    vibrato.start(now);
    voice.stop(now + seconds);
    vibrato.stop(now + seconds);
  };

  return {
    scream(seconds: number) {
      if (scream === "synth") synthScream(seconds);
      else if (scream !== "off") player.play(scream, volume);
    },

    thud() {
      if (impact !== "synth") {
        if (impact !== "off") player.play(impact, volume);
        return;
      }
      const ac = audio();
      const now = ac.currentTime;
      const boom = ac.createOscillator();
      boom.frequency.setValueAtTime(120, now);
      boom.frequency.exponentialRampToValueAtTime(35, now + 0.3);
      const out = ac.createGain();
      out.gain.setValueAtTime(volume, now);
      out.gain.exponentialRampToValueAtTime(0.0001, now + 0.35);
      boom.connect(out).connect(ac.destination);
      boom.start(now);
      boom.stop(now + 0.35);
    },

    /** Cartoon "something is falling" whistle, dropping in pitch. */
    whistle(seconds: number) {
      if (!sfx) return;
      const ac = audio();
      const now = ac.currentTime;
      const tone = ac.createOscillator();
      tone.frequency.setValueAtTime(1900, now);
      tone.frequency.exponentialRampToValueAtTime(450, now + seconds);
      const out = ac.createGain();
      out.gain.setValueAtTime(0.0001, now);
      out.gain.exponentialRampToValueAtTime(volume * 0.35, now + 0.1);
      out.gain.setValueAtTime(volume * 0.35, now + seconds * 0.9);
      out.gain.exponentialRampToValueAtTime(0.0001, now + seconds);
      tone.connect(out).connect(ac.destination);
      tone.start(now);
      tone.stop(now + seconds);
    },

    /** Hiss of something hitting lava. */
    sizzle() {
      if (!sfx) return;
      const ac = audio();
      const now = ac.currentTime;
      const seconds = 1.1;
      const buffer = ac.createBuffer(1, ac.sampleRate * seconds, ac.sampleRate);
      const samples = buffer.getChannelData(0);
      for (let i = 0; i < samples.length; i++) samples[i] = Math.random() * 2 - 1;
      const noise = ac.createBufferSource();
      noise.buffer = buffer;
      const filter = ac.createBiquadFilter();
      filter.type = "highpass";
      filter.frequency.value = 3000;
      const out = ac.createGain();
      out.gain.setValueAtTime(volume * 0.5, now);
      out.gain.exponentialRampToValueAtTime(0.0001, now + seconds);
      noise.connect(filter).connect(out).connect(ac.destination);
      noise.start(now);
    },

    /** Wobbly flying-saucer hum. */
    hum(seconds: number) {
      if (!sfx) return;
      const ac = audio();
      const now = ac.currentTime;
      const out = ac.createGain();
      out.gain.setValueAtTime(0.0001, now);
      out.gain.exponentialRampToValueAtTime(volume * 0.3, now + 0.4);
      out.gain.setValueAtTime(volume * 0.3, now + seconds - 0.3);
      out.gain.exponentialRampToValueAtTime(0.0001, now + seconds);
      out.connect(ac.destination);

      const warble = ac.createOscillator();
      warble.frequency.value = 6;
      const warbleDepth = ac.createGain();
      warbleDepth.gain.value = 60;
      warble.connect(warbleDepth);

      // Two close low tones beat against each other under a warbling high one
      for (const [frequency, gain] of [
        [140, 1],
        [146, 1],
        [620, 0.25],
      ]) {
        const tone = ac.createOscillator();
        tone.frequency.value = frequency;
        if (frequency > 300) warbleDepth.connect(tone.frequency);
        const level = ac.createGain();
        level.gain.value = gain;
        tone.connect(level).connect(out);
        tone.start(now);
        tone.stop(now + seconds);
      }
      warble.start(now);
      warble.stop(now + seconds);
    },

    dispose() {
      player.dispose();
      context?.close().catch(() => {});
    },
  };
}

export type Sounds = ReturnType<typeof createSounds>;
