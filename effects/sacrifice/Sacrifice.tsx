"use client";

import { useEffect, useRef } from "react";
import { fullscreen, runCanvas } from "../canvas";
import type { EffectProps } from "../types";
import { anvil } from "./scenes/anvil";
import { cannon } from "./scenes/cannon";
import { cliff } from "./scenes/cliff";
import { lightning } from "./scenes/lightning";
import { shark } from "./scenes/shark";
import { trapdoor } from "./scenes/trapdoor";
import { ufo } from "./scenes/ufo";
import { volcano } from "./scenes/volcano";
import { clamp01, type Scene } from "./shared";
import { createSounds } from "./sound";

// The keys are the values of the `scene` param; "random" picks one of them
const SCENES: Record<string, Scene> = {
  cliff,
  volcano,
  ufo,
  anvil,
  lightning,
  cannon,
  trapdoor,
  shark,
};

interface SacrificeParams {
  scene: string;
  name: string;
  color: string;
  scale: number;
  speed: number;
  sound: string;
  impact: string;
  sfx: boolean;
  volume: number;
}

export default function Sacrifice({ params }: EffectProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const p = params as unknown as SacrificeParams;
    const ids = Object.keys(SCENES);
    const scene =
      SCENES[p.scene] ?? SCENES[ids[Math.floor(Math.random() * ids.length)]];
    const sounds = createSounds({
      scream: p.sound,
      impact: p.impact,
      sfx: p.sfx,
      volume: p.volume,
    });

    const stop = runCanvas(canvas, (ctx, size) => {
      const draw = scene(ctx, size, {
        name: p.name.trim().slice(0, 24),
        color: p.color,
        scale: p.scale,
        speed: p.speed,
        sounds,
      });

      return (_dt, time) => {
        const t = time * p.speed;
        ctx.clearRect(0, 0, size.width, size.height);
        ctx.save();
        const visibility = draw(t);
        ctx.restore();
        // Every scene fades in at the start and reports its own fade-out
        canvas.style.opacity = String(clamp01(t / 0.4) * visibility);
      };
    });

    return () => {
      stop();
      sounds.dispose();
    };
  }, [params]);

  return <canvas ref={canvasRef} style={fullscreen} />;
}
