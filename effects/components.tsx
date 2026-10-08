"use client";

import Confetti from "./confetti/Confetti";
import EmojiRain from "./emojirain/EmojiRain";
import Fireworks from "./fireworks/Fireworks";
import Glitch from "./glitch/Glitch";
import Lights from "./lights/Lights";
import Matrix from "./matrix/Matrix";
import Message from "./message/Message";
import Sacrifice from "./sacrifice/Sacrifice";
import Snow from "./snow/Snow";
import type { EffectComponent } from "./types";

// Effect id -> the component that draws it on the overlay page.
export const effectComponents: Record<string, EffectComponent> = {
  fireworks: Fireworks,
  confetti: Confetti,
  glitch: Glitch,
  matrix: Matrix,
  emojirain: EmojiRain,
  snow: Snow,
  sacrifice: Sacrifice,
  lights: Lights,
  message: Message,
};
