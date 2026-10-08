import { durationParam } from "../canvas";
import { soundParams } from "../sound";
import type { EffectDefinition } from "../types";

export const snow: EffectDefinition = {
  id: "snow",
  name: "Snow",
  description: "Soft flakes drifting down the screen, with wind.",
  params: [
    {
      key: "count",
      label: "Flakes",
      type: "number",
      default: 150,
      min: 20,
      max: 600,
    },
    {
      key: "size",
      label: "Largest flake",
      type: "number",
      default: 4,
      min: 1,
      max: 12,
      step: 0.5,
      unit: "px",
    },
    {
      key: "speed",
      label: "Fall speed",
      type: "number",
      default: 1,
      min: 0.2,
      max: 5,
      step: 0.1,
    },
    {
      key: "wind",
      label: "Wind",
      type: "number",
      default: 0.5,
      min: -5,
      max: 5,
      step: 0.1,
      help: "Negative blows left, positive blows right.",
    },
    { key: "color", label: "Colour", type: "color", default: "#ffffff" },
    {
      key: "opacity",
      label: "Opacity",
      type: "number",
      default: 0.9,
      min: 0.1,
      max: 1,
      step: 0.05,
    },
    ...soundParams({ help: "Plays when the effect starts.", loop: true }),
    durationParam,
  ],
};
