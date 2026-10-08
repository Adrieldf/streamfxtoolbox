"use client";

import { useEffect, useRef } from "react";
import { fullscreen, runCanvas } from "../canvas";
import { withStartSound } from "../sound";
import type { EffectProps } from "../types";

interface MatrixParams {
  color: string;
  charset: "katakana" | "binary" | "latin";
  fontSize: number;
  speed: number;
  density: number;
  trail: number;
  sound: string;
  volume: number;
  soundLoop: boolean;
  duration: number;
}

interface Drop {
  head: number;
  speed: number;
  seed: number;
}

const CHARSETS: Record<MatrixParams["charset"], string> = {
  katakana:
    "アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン0123456789",
  binary: "01",
  latin: "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789",
};

export default function Matrix({ params }: EffectProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const p = params as unknown as MatrixParams;
    const glyphs = CHARSETS[p.charset];

    return withStartSound(
      p,
      runCanvas(
        canvas,
        (ctx, size) => {
          let drops: Drop[] = [];

          const spawn = (rows: number, initial: boolean): Drop => ({
            // Lower density starts the drop further above the screen
            head: initial
              ? (Math.random() * 2 - 1 / p.density) * rows
              : -Math.random() * rows * (1 / p.density - 0.9),
            speed: p.speed * (0.6 + Math.random() * 0.8),
            seed: Math.floor(Math.random() * 1e6),
          });

          // Each cell keeps the same character for the life of its drop
          const glyph = (col: number, row: number, seed: number) =>
            glyphs[
              (((col * 73856093) ^ (row * 19349663) ^ (seed * 83492791)) >>> 0) %
                glyphs.length
            ];

          return (dt) => {
            const { width, height } = size;
            const cols = Math.ceil(width / p.fontSize);
            const rows = Math.ceil(height / p.fontSize);
            if (drops.length !== cols) {
              drops = Array.from({ length: cols }, () => spawn(rows, true));
            }

            ctx.clearRect(0, 0, width, height);
            ctx.font = `${p.fontSize}px "MS Gothic", "Noto Sans Mono CJK JP", monospace`;
            ctx.textAlign = "center";
            ctx.textBaseline = "top";

            for (let col = 0; col < cols; col++) {
              const drop = drops[col];
              drop.head += drop.speed * dt;
              if (drop.head - p.trail > rows) {
                drops[col] = spawn(rows, false);
                continue;
              }
              const headRow = Math.floor(drop.head);
              for (let k = 0; k < p.trail; k++) {
                const row = headRow - k;
                if (row < 0 || row >= rows) continue;
                ctx.globalAlpha = 1 - k / p.trail;
                ctx.fillStyle = k === 0 ? "#ffffff" : p.color;
                ctx.fillText(
                  glyph(col, row, drop.seed),
                  col * p.fontSize + p.fontSize / 2,
                  row * p.fontSize,
                );
              }
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
