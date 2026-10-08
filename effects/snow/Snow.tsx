"use client";

import { useEffect, useRef } from "react";
import { fullscreen, runCanvas } from "../canvas";
import { withStartSound } from "../sound";
import type { EffectProps } from "../types";

interface SnowParams {
  count: number;
  size: number;
  speed: number;
  wind: number;
  color: string;
  opacity: number;
  sound: string;
  volume: number;
  soundLoop: boolean;
  duration: number;
}

interface Flake {
  x: number;
  y: number;
  /** 0.3 – 1: small, slow and faint through to large, fast and bright */
  depth: number;
  phase: number;
  sway: number;
}

export default function Snow({ params }: EffectProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const p = params as unknown as SnowParams;

    return withStartSound(
      p,
      runCanvas(
        canvas,
        (ctx, size) => {
          const flakes: Flake[] = Array.from({ length: p.count }, () => ({
            x: Math.random() * size.width,
            y: Math.random() * size.height,
            depth: 0.3 + Math.random() * 0.7,
            phase: Math.random() * Math.PI * 2,
            sway: 0.5 + Math.random(),
          }));

          return (dt, time) => {
            const { width, height } = size;
            ctx.clearRect(0, 0, width, height);
            ctx.fillStyle = p.color;

            for (const f of flakes) {
              const r = p.size * f.depth;
              f.y += (30 + 60 * f.depth) * p.speed * dt;
              f.x +=
                (p.wind * 25 * f.depth +
                  Math.sin(time * f.sway + f.phase) * 15) *
                dt;

              if (f.y > height + r) {
                f.y = -r;
                f.x = Math.random() * width;
              }
              if (f.x < -r) f.x = width + r;
              else if (f.x > width + r) f.x = -r;

              ctx.globalAlpha = p.opacity * (0.4 + 0.6 * f.depth);
              ctx.beginPath();
              ctx.arc(f.x, f.y, r, 0, Math.PI * 2);
              ctx.fill();
            }
            ctx.globalAlpha = 1;
          };
        },
        p.duration,
      ),
    );
  }, [params]);

  return <canvas ref={canvasRef} style={fullscreen} />;
}
