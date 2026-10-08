"use client";

import { useEffect, useRef } from "react";
import { fullscreen, runCanvas } from "../canvas";
import { withStartSound } from "../sound";
import { emojiRain } from "./definition";
import type { EffectProps } from "../types";

interface EmojiRainParams {
  emojis: string;
  direction: "down" | "up";
  count: number;
  size: number;
  speed: number;
  spin: boolean;
  sound: string;
  volume: number;
  soundLoop: boolean;
  duration: number;
}

interface Item {
  glyph: string;
  x: number;
  y: number;
  size: number;
  velocity: number;
  rotation: number;
  spin: number;
  phase: number;
}

// Splits by grapheme so flags and skin-tone emojis stay in one piece
function splitEmojis(text: string): string[] {
  const segmenter = new Intl.Segmenter(undefined, { granularity: "grapheme" });
  return Array.from(segmenter.segment(text), (s) => s.segment).filter(
    (s) => s.trim() !== "",
  );
}

export default function EmojiRain({ params }: EffectProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const p = params as unknown as EmojiRainParams;
    let glyphs = splitEmojis(p.emojis);
    if (glyphs.length === 0) {
      glyphs = splitEmojis(String(emojiRain.params[0].default));
    }
    const sign = p.direction === "up" ? -1 : 1;

    return withStartSound(
      p,
      runCanvas(
        canvas,
        (ctx, size) => {
          const make = (initial: boolean): Item => {
            const itemSize = p.size * (0.6 + Math.random() * 0.6);
            const offscreen = sign === 1 ? -itemSize : size.height + itemSize;
            return {
              glyph: glyphs[Math.floor(Math.random() * glyphs.length)],
              x: Math.random() * size.width,
              y: initial ? Math.random() * size.height : offscreen,
              size: itemSize,
              velocity: (80 + Math.random() * 120) * p.speed * sign,
              rotation: p.spin ? Math.random() * Math.PI * 2 : 0,
              spin: p.spin ? (Math.random() - 0.5) * 3 : 0,
              phase: Math.random() * Math.PI * 2,
            };
          };
          const items = Array.from({ length: p.count }, () => make(true));

          return (dt, time) => {
            const { width, height } = size;
            ctx.clearRect(0, 0, width, height);
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";

            items.forEach((item, i) => {
              item.y += item.velocity * dt;
              item.x += Math.sin(time + item.phase) * 20 * dt;
              item.rotation += item.spin * dt;
              if (item.y > height + item.size || item.y < -item.size) {
                item = items[i] = make(false);
              }

              ctx.save();
              ctx.translate(item.x, item.y);
              ctx.rotate(item.rotation);
              ctx.font = `${item.size}px "Segoe UI Emoji", "Apple Color Emoji", "Noto Color Emoji", sans-serif`;
              ctx.fillText(item.glyph, 0, 0);
              ctx.restore();
            });
          };
        },
        p.duration,
      ),
    );
  }, [params]);

  return <canvas ref={canvasRef} style={fullscreen} />;
}
