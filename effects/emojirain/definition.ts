import { durationParam } from "../canvas";
import { soundParams } from "../sound";
import type { EffectDefinition } from "../types";

export const emojiRain: EffectDefinition = {
  id: "emojirain",
  name: "Emoji rain",
  description:
    "Emojis of your choice falling down the screen, or floating up like reactions.",
  params: [
    {
      key: "emojis",
      label: "Emojis",
      type: "text",
      default: "🎉🔥💜⭐",
      help: "Each one is picked at random.",
    },
    {
      key: "direction",
      label: "Direction",
      type: "select",
      default: "down",
      options: [
        { value: "down", label: "Fall down" },
        { value: "up", label: "Float up" },
      ],
    },
    {
      key: "count",
      label: "On screen",
      type: "number",
      default: 40,
      min: 5,
      max: 200,
    },
    {
      key: "size",
      label: "Size",
      type: "number",
      default: 48,
      min: 16,
      max: 160,
      unit: "px",
    },
    {
      key: "speed",
      label: "Speed",
      type: "number",
      default: 1,
      min: 0.2,
      max: 5,
      step: 0.1,
    },
    { key: "spin", label: "Spin", type: "boolean", default: true },
    ...soundParams({ help: "Plays when the effect starts.", loop: true }),
    durationParam,
  ],
};
