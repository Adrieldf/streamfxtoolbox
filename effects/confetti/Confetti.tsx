"use client";

import { useEffect, useRef } from "react";
import confetti from "canvas-confetti";
import { fullscreen } from "../canvas";
import { createSoundPlayer } from "../sound";
import type { EffectProps } from "../types";

interface ConfettiParams {
  mode: "cannons" | "burst" | "rain";
  count: number;
  interval: number;
  power: number;
  spread: number;
  palette: "rainbow" | "purple" | "gold" | "pastel";
  size: number;
  gravity: number;
  sound: string;
  volume: number;
  duration: number;
}

// `undefined` keeps the library's own multicolour set
const PALETTES: Record<ConfettiParams["palette"], string[] | undefined> = {
  rainbow: undefined,
  purple: ["#9146ff", "#bf94ff", "#772ce8", "#ffffff"],
  gold: ["#ffd700", "#ffb300", "#fff4b8", "#e09f00"],
  pastel: ["#ffb3ba", "#ffdfba", "#ffffba", "#baffc9", "#bae1ff"],
};

const RAIN_TICK_MS = 100;

export default function Confetti({ params }: EffectProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const p = params as unknown as ConfettiParams;

    const fire = confetti.create(canvas, { resize: true });
    const player = createSoundPlayer();
    const base: confetti.Options = {
      colors: PALETTES[p.palette],
      scalar: p.size,
      disableForReducedMotion: false,
    };

    const shoot = (x: number, y: number, angle: number) =>
      fire({
        ...base,
        particleCount: p.count,
        angle,
        spread: p.spread,
        startVelocity: p.power,
        gravity: p.gravity,
        ticks: 300,
        origin: { x, y },
      });

    let round: () => void;
    let everyMs: number;
    if (p.mode === "rain") {
      round = () =>
        fire({
          ...base,
          particleCount: Math.max(1, Math.round((p.count * RAIN_TICK_MS) / 1000)),
          angle: 270,
          spread: 50,
          startVelocity: 8,
          gravity: p.gravity * 0.6,
          ticks: 600,
          origin: { x: Math.random(), y: -0.05 },
        });
      everyMs = RAIN_TICK_MS;
    } else if (p.mode === "burst") {
      round = () => {
        player.play(p.sound, p.volume);
        shoot(0.5, 0.5, 90);
      };
      everyMs = p.interval * 1000;
    } else {
      round = () => {
        player.play(p.sound, p.volume);
        shoot(0, 0.9, 60);
        shoot(1, 0.9, 120);
      };
      everyMs = p.interval * 1000;
    }

    const timers: number[] = [];
    // Rain is continuous, so its sound plays once at the start
    if (p.mode === "rain") player.play(p.sound, p.volume);
    round();
    if (everyMs > 0) {
      const repeat = window.setInterval(round, everyMs);
      timers.push(repeat);
      if (p.duration > 0) {
        timers.push(
          window.setTimeout(
            () => window.clearInterval(repeat),
            p.duration * 1000,
          ),
        );
      }
    }

    return () => {
      timers.forEach((t) => window.clearTimeout(t));
      fire.reset();
      player.dispose();
    };
  }, [params]);

  return <canvas ref={canvasRef} style={fullscreen} />;
}
