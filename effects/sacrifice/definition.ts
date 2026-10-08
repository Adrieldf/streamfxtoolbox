import { librarySoundOptions } from "../sound";
import type { EffectDefinition } from "../types";

export const sacrifice: EffectDefinition = {
  id: "sacrifice",
  name: "Sacrifice",
  description:
    "A stick figure with a name above its head meets a cartoon end: off a cliff, into a volcano, taken by a UFO, under an anvil, struck by lightning, fired from a cannon, through a trapdoor or eaten by a shark. Plays once.",
  // Every scene takes about 10 seconds at normal speed
  oneShotSeconds: (v) => Math.ceil(12 / (v.speed as number)),
  params: [
    {
      key: "scene",
      label: "Scene",
      type: "select",
      default: "random",
      options: [
        { value: "random", label: "Random" },
        { value: "cliff", label: "Cliff jump" },
        { value: "volcano", label: "Volcano dive" },
        { value: "ufo", label: "UFO abduction" },
        { value: "anvil", label: "Falling anvil" },
        { value: "lightning", label: "Lightning strike" },
        { value: "cannon", label: "Human cannonball" },
        { value: "trapdoor", label: "Trapdoor" },
        { value: "shark", label: "Shark" },
      ],
      help: "Random picks a different scene each time it plays.",
    },
    {
      key: "name",
      label: "Name",
      type: "text",
      default: "Chat",
      help: "Shown above the stick figure.",
    },
    { key: "color", label: "Figure colour", type: "color", default: "#ffffff" },
    {
      key: "scale",
      label: "Scene size",
      type: "number",
      default: 1,
      min: 0.5,
      max: 2,
      step: 0.1,
    },
    {
      key: "speed",
      label: "Speed",
      type: "number",
      default: 1,
      min: 0.5,
      max: 2,
      step: 0.1,
    },
    {
      key: "sound",
      label: "Scream",
      type: "select",
      default: "synth",
      options: [
        { value: "synth", label: "Built-in cartoon scream" },
        ...librarySoundOptions,
        { value: "off", label: "Off" },
      ],
    },
    {
      key: "impact",
      label: "Impact sound",
      type: "select",
      default: "synth",
      options: [
        { value: "synth", label: "Built-in thud" },
        ...librarySoundOptions,
        { value: "off", label: "Off" },
      ],
      help: "Plays when the figure lands, splashes or is squashed.",
    },
    {
      key: "sfx",
      label: "Scene sound effects",
      type: "boolean",
      default: true,
      help: "The falling whistle, lava sizzle and saucer hum.",
    },
    {
      key: "volume",
      label: "Volume",
      type: "number",
      default: 0.7,
      min: 0,
      max: 1,
      step: 0.05,
    },
  ],
};
