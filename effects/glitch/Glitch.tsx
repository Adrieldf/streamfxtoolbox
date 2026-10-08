"use client";

import { useEffect, useRef } from "react";
import { fullscreen, runCanvas } from "../canvas";
import { createSoundPlayer } from "../sound";
import type { EffectProps } from "../types";

interface GlitchParams {
  intensity: number;
  interval: number;
  length: number;
  colorA: string;
  colorB: string;
  scanlines: boolean;
  noise: boolean;
  text: string;
  textSize: number;
  textColor: string;
  sound: string;
  volume: number;
  duration: number;
}

interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
  color: string;
  alpha: number;
}

interface TextSlice {
  y: number;
  h: number;
  dx: number;
}

// The pattern is redrawn at this rate rather than every frame so it looks choppy
const PATTERN_SECONDS = 0.06;

export default function Glitch({ params }: EffectProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const p = params as unknown as GlitchParams;

    const player = createSoundPlayer();
    if (p.interval === 0) {
      // Constant glitching: the sound runs for as long as the effect does
      player.play(p.sound, p.volume, {
        loop: true,
        maxSeconds: p.duration || undefined,
      });
    }

    const stop = runCanvas(
      canvas,
      (ctx, size) => {
        let rects: Rect[] = [];
        let slices: TextSlice[] = [];
        let split = 0;
        let burstUntil = 0;
        let nextBurst = 0.3;
        let nextPattern = 0;

        const newPattern = () => {
          const { width, height } = size;
          const colors = [p.colorA, p.colorB, "#ffffff"];
          rects = [];

          for (let i = 0; i < Math.round(p.intensity * 1.5); i++) {
            const w = width * (0.15 + Math.random() * 0.85);
            const rect: Rect = {
              x: Math.random() * (width - w),
              y: Math.random() * height,
              w,
              h: 2 + Math.random() ** 2 * height * 0.07,
              color: colors[Math.floor(Math.random() * colors.length)],
              alpha: 0.15 + Math.random() * 0.45,
            };
            rects.push(rect);
            if (Math.random() < 0.5) {
              // Offset twin in the other colour gives the RGB-split look
              rects.push({
                ...rect,
                x: rect.x + (Math.random() - 0.5) * p.intensity * 12,
                y: rect.y + 2,
                color: rect.color === p.colorA ? p.colorB : p.colorA,
              });
            }
          }

          if (p.noise) {
            for (let i = 0; i < p.intensity * 25; i++) {
              rects.push({
                x: Math.random() * width,
                y: Math.random() * height,
                w: 2 + Math.random() * 40,
                h: 1 + Math.random() * 2,
                color: Math.random() < 0.5 ? "#ffffff" : "#000000",
                alpha: 0.3 + Math.random() * 0.5,
              });
            }
          }

          split = ((2 + Math.random() * p.intensity * 2) * p.textSize) / 100;
          slices = Array.from({ length: 2 + Math.floor(Math.random() * 3) }, () => ({
            y: Math.random() * p.textSize,
            h: p.textSize * (0.05 + Math.random() * 0.2),
            dx: (Math.random() - 0.5) * p.intensity * p.textSize * 0.12,
          }));
        };

        const drawText = (active: boolean) => {
          const cx = size.width / 2;
          const cy = size.height / 2;
          ctx.font = `900 ${p.textSize}px "Arial Black", Impact, sans-serif`;
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";

          const layers = (x: number) => {
            if (active) {
              ctx.globalAlpha = 0.8;
              ctx.fillStyle = p.colorA;
              ctx.fillText(p.text, x - split, cy);
              ctx.fillStyle = p.colorB;
              ctx.fillText(p.text, x + split, cy);
            }
            ctx.globalAlpha = 1;
            ctx.fillStyle = p.textColor;
            ctx.fillText(p.text, x, cy);
          };

          layers(cx);
          if (!active) return;
          for (const s of slices) {
            // Redraw one horizontal band of the text shifted sideways
            const top = cy - p.textSize / 2 + s.y;
            ctx.save();
            ctx.beginPath();
            ctx.rect(0, top, size.width, s.h);
            ctx.clip();
            ctx.clearRect(0, top, size.width, s.h);
            layers(cx + s.dx);
            ctx.restore();
          }
        };

        return (_dt, time) => {
          const { width, height } = size;
          ctx.clearRect(0, 0, width, height);

          let active = p.interval === 0 || time < burstUntil;
          if (!active && time >= nextBurst) {
            burstUntil = time + p.length;
            player.play(p.sound, p.volume, { maxSeconds: p.length });
            nextBurst = burstUntil + p.interval * (0.6 + Math.random() * 0.8);
            active = true;
          }

          if (active) {
            if (time >= nextPattern) {
              newPattern();
              nextPattern = time + PATTERN_SECONDS;
            }
            if (p.scanlines) {
              ctx.globalAlpha = 1;
              ctx.fillStyle = "rgba(0, 0, 0, 0.2)";
              for (let y = 0; y < height; y += 4) ctx.fillRect(0, y, width, 1);
              ctx.fillStyle = "rgba(255, 255, 255, 0.06)";
              ctx.fillRect(0, (time * 400) % height, width, 60);
            }
            for (const r of rects) {
              ctx.globalAlpha = r.alpha;
              ctx.fillStyle = r.color;
              ctx.fillRect(r.x, r.y, r.w, r.h);
            }
            ctx.globalAlpha = 1;
          }

          if (p.text) drawText(active);
        };
      },
      p.duration,
    );

    return () => {
      stop();
      player.dispose();
    };
  }, [params]);

  return <canvas ref={canvasRef} style={fullscreen} />;
}
