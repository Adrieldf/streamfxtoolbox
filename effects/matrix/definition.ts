import { durationParam } from "../canvas";
import { soundParams } from "../sound";
import type { EffectDefinition } from "../types";

export const matrix: EffectDefinition = {
  id: "matrix",
  name: "Matrix rain",
  description: "Columns of falling characters with fading trails.",
  params: [
    { key: "color", label: "Colour", type: "color", default: "#00ff66" },
    {
      key: "charset",
      label: "Characters",
      type: "select",
      default: "katakana",
      options: [
        { value: "katakana", label: "Katakana" },
        { value: "binary", label: "Binary" },
        { value: "latin", label: "Letters and digits" },
      ],
    },
    {
      key: "fontSize",
      label: "Character size",
      type: "number",
      default: 20,
      min: 10,
      max: 48,
      unit: "px",
    },
    {
      key: "speed",
      label: "Speed",
      type: "number",
      default: 14,
      min: 1,
      max: 40,
      help: "Rows per second.",
    },
    {
      key: "density",
      label: "Density",
      type: "number",
      default: 0.7,
      min: 0.1,
      max: 1,
      step: 0.05,
      help: "Lower values leave longer gaps between drops.",
    },
    {
      key: "trail",
      label: "Trail length",
      type: "number",
      default: 18,
      min: 4,
      max: 40,
      help: "Characters behind each drop.",
    },
    ...soundParams({ help: "Plays when the effect starts.", loop: true }),
    durationParam,
  ],
};
