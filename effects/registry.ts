import { confetti } from "./confetti/definition";
import { emojiRain } from "./emojirain/definition";
import { fireworks } from "./fireworks/definition";
import { glitch } from "./glitch/definition";
import { lights } from "./lights/definition";
import { matrix } from "./matrix/definition";
import { message } from "./message/definition";
import { sacrifice } from "./sacrifice/definition";
import { snow } from "./snow/definition";
import type { EffectDefinition } from "./types";

// Every effect listed here shows up in the control panel and is reachable at
// /overlay/<id>. Its component must also be added to effects/components.tsx.
export const effects: EffectDefinition[] = [
  fireworks,
  confetti,
  glitch,
  matrix,
  emojiRain,
  snow,
  sacrifice,
  lights,
  message,
];

export function getEffect(id: string): EffectDefinition | undefined {
  return effects.find((e) => e.id === id);
}
