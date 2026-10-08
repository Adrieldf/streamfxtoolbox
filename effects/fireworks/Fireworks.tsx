"use client";

import { useEffect, useRef } from "react";
import { Fireworks as FireworksJs } from "fireworks-js";
import { soundUrl } from "../sound";
import type { EffectProps } from "../types";

interface FireworksParams {
  mode: "continuous" | "burst";
  intensity: number;
  count: number;
  interval: number;
  duration: number;
  hueMin: number;
  hueMax: number;
  particles: number;
  explosion: number;
  spread: number;
  gravity: number;
  trail: number;
  sound: string;
  volume: number;
}

export default function Fireworks({ params }: EffectProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const p = params as unknown as FireworksParams;

    const sound = soundUrl(p.sound);

    const fx = new FireworksJs(container, {
      autoresize: true,
      opacity: p.trail,
      intensity: p.intensity,
      particles: p.particles,
      explosion: p.explosion,
      gravity: p.gravity,
      hue: {
        min: Math.min(p.hueMin, p.hueMax),
        max: Math.max(p.hueMin, p.hueMax),
      },
      rocketsPoint: { min: 50 - p.spread / 2, max: 50 + p.spread / 2 },
      mouse: { click: false, move: false, max: 1 },
      // The library plays this on every explosion, at a random volume in the range
      sound: {
        enabled: sound !== null && p.volume > 0,
        files: sound ? [sound] : [],
        volume: { min: p.volume * 50, max: p.volume * 100 },
      },
    });

    const timers: number[] = [];
    const durationMs = p.duration * 1000;

    if (p.mode === "burst") {
      // launch() starts the loop and stops it once the rockets burn out
      fx.launch(p.count);
      if (p.interval > 0) {
        const repeat = window.setInterval(
          () => fx.launch(p.count),
          p.interval * 1000,
        );
        timers.push(repeat);
        if (durationMs > 0) {
          timers.push(
            window.setTimeout(() => window.clearInterval(repeat), durationMs),
          );
        }
      }
    } else {
      fx.start();
      if (durationMs > 0) {
        // waitStop() lets rockets already in the air finish
        timers.push(window.setTimeout(() => fx.waitStop(), durationMs));
      }
    }

    return () => {
      timers.forEach((t) => window.clearTimeout(t));
      fx.stop(true);
    };
  }, [params]);

  return <div ref={containerRef} style={{ position: "fixed", inset: 0 }} />;
}
