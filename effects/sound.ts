import { soundLibrary } from "./soundLibrary.generated";
import type { ParamDef } from "./types";

const NONE = "none";
const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

/** URL of a sound from public/sounds, or null for "none" and unknown ids. */
export function soundUrl(id: string): string | null {
  const sound = soundLibrary.find((s) => s.id === id);
  return sound ? `${BASE_PATH}/sounds/${encodeURIComponent(sound.file)}` : null;
}

export const librarySoundOptions = soundLibrary.map((s) => ({
  value: s.id,
  label: s.label,
}));

/** `id` if that sound is in public/sounds, otherwise "none". */
export const soundOrNone = (id: string) =>
  soundLibrary.some((s) => s.id === id) ? id : NONE;

/**
 * The `sound` and `volume` params shared by effects, plus `soundLoop` for
 * effects that play their sound once at the start rather than on an event.
 */
export function soundParams(options: {
  /** Used when that file exists in public/sounds */
  default?: string;
  help: string;
  loop?: boolean;
}): ParamDef[] {
  const params: ParamDef[] = [
    {
      key: "sound",
      label: "Sound",
      type: "select",
      default: soundOrNone(options.default ?? NONE),
      options: [{ value: NONE, label: "None" }, ...librarySoundOptions],
      help: options.help,
    },
    {
      key: "volume",
      label: "Volume",
      type: "number",
      default: 0.6,
      min: 0,
      max: 1,
      step: 0.05,
      showIf: (v) => v.sound !== NONE,
    },
  ];
  if (options.loop) {
    params.push({
      key: "soundLoop",
      label: "Repeat sound",
      type: "boolean",
      default: false,
      help: "Keep replaying the sound for as long as the effect runs.",
      showIf: (v) => v.sound !== NONE,
    });
  }
  return params;
}

/**
 * Plays sounds from public/sounds and stops them all on dispose. Browsers only
 * allow sound after the page has been interacted with; OBS always allows it.
 */
export function createSoundPlayer() {
  const playing = new Set<HTMLAudioElement>();
  const timers: number[] = [];

  return {
    play(
      id: string,
      volume: number,
      options: { loop?: boolean; maxSeconds?: number } = {},
    ) {
      const url = soundUrl(id);
      if (!url || volume <= 0) return;
      const audio = new Audio(url);
      audio.volume = Math.min(1, volume);
      audio.loop = options.loop ?? false;
      playing.add(audio);
      audio.addEventListener("ended", () => playing.delete(audio));
      audio.play().catch(() => playing.delete(audio));
      if (options.maxSeconds) {
        timers.push(
          window.setTimeout(() => {
            audio.pause();
            playing.delete(audio);
          }, options.maxSeconds * 1000),
        );
      }
    },

    dispose() {
      timers.forEach((t) => window.clearTimeout(t));
      playing.forEach((audio) => audio.pause());
      playing.clear();
    },
  };
}

/**
 * For effects whose sound simply starts with the effect: plays it, and returns
 * a cleanup that stops both the sound and the effect.
 */
export function withStartSound(
  p: { sound: string; volume: number; soundLoop: boolean; duration: number },
  stopEffect: () => void,
): () => void {
  const player = createSoundPlayer();
  player.play(p.sound, p.volume, {
    loop: p.soundLoop,
    maxSeconds: p.duration || undefined,
  });
  return () => {
    stopEffect();
    player.dispose();
  };
}

export type SoundPlayer = ReturnType<typeof createSoundPlayer>;
