import { durationParam } from "../canvas";
import { soundParams } from "../sound";
import type { EffectDefinition } from "../types";

export const glitch: EffectDefinition = {
  id: "glitch",
  name: "Glitch",
  description:
    "Bursts of colour-split slices, noise and scanlines drawn over the stream, with optional glitching text. It draws on top of the video; it cannot distort the video itself.",
  params: [
    {
      key: "intensity",
      label: "Intensity",
      type: "number",
      default: 5,
      min: 1,
      max: 10,
      help: "How many slices and how far they jump.",
    },
    {
      key: "interval",
      label: "Time between bursts",
      type: "number",
      default: 2,
      min: 0,
      max: 30,
      step: 0.5,
      unit: "s",
      help: "0 glitches constantly.",
    },
    {
      key: "length",
      label: "Burst length",
      type: "number",
      default: 0.4,
      min: 0.1,
      max: 3,
      step: 0.1,
      unit: "s",
      showIf: (v) => v.interval !== 0,
    },
    { key: "colorA", label: "Colour A", type: "color", default: "#00fff0" },
    { key: "colorB", label: "Colour B", type: "color", default: "#ff00c8" },
    {
      key: "scanlines",
      label: "Scanlines",
      type: "boolean",
      default: true,
      help: "Dark lines across the screen during a burst.",
    },
    { key: "noise", label: "Noise specks", type: "boolean", default: true },
    {
      key: "text",
      label: "Text",
      type: "text",
      default: "",
      help: "Optional text in the centre that glitches with each burst.",
    },
    {
      key: "textSize",
      label: "Text size",
      type: "number",
      default: 140,
      min: 20,
      max: 400,
      unit: "px",
      showIf: (v) => v.text !== "",
    },
    {
      key: "textColor",
      label: "Text colour",
      type: "color",
      default: "#ffffff",
      showIf: (v) => v.text !== "",
    },
    ...soundParams({ default: "glitchys", help: "Plays during each burst." }),
    durationParam,
  ],
};
