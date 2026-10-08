import type { CSSProperties } from "react";
import type { NumberParam } from "./types";

export interface CanvasSize {
  width: number;
  height: number;
}

/** Called every animation frame with seconds since the last frame and since start. */
export type Frame = (dt: number, time: number) => void;

export const fullscreen: CSSProperties = {
  position: "fixed",
  inset: 0,
  width: "100%",
  height: "100%",
};

/** Shared `duration` param for effects that run through runCanvas. */
export const durationParam: NumberParam = {
  key: "duration",
  label: "Duration",
  type: "number",
  default: 0,
  min: 0,
  max: 300,
  unit: "s",
  help: "Fade out after this long. 0 runs forever.",
};

const FADE_MS = 800;

/**
 * Sizes a canvas to the window, runs `setup` once and then its returned frame
 * function on every animation frame. Returns the cleanup function.
 * Resizing resets canvas state, so set fonts and styles inside the frame.
 */
export function runCanvas(
  canvas: HTMLCanvasElement,
  setup: (ctx: CanvasRenderingContext2D, size: CanvasSize) => Frame,
  durationSec = 0,
): () => void {
  const ctx = canvas.getContext("2d");
  if (!ctx) return () => {};

  const size: CanvasSize = { width: 0, height: 0 };
  const resize = () => {
    const dpr = window.devicePixelRatio || 1;
    size.width = window.innerWidth;
    size.height = window.innerHeight;
    canvas.width = Math.round(size.width * dpr);
    canvas.height = Math.round(size.height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  };
  resize();
  window.addEventListener("resize", resize);

  const frame = setup(ctx, size);
  const start = performance.now();
  let last = start;
  let raf = requestAnimationFrame(function tick(now) {
    // Clamp so a throttled tab doesn't teleport everything on its next frame
    const dt = Math.min(0.1, (now - last) / 1000);
    last = now;
    frame(dt, (now - start) / 1000);
    raf = requestAnimationFrame(tick);
  });

  const timers: number[] = [];
  if (durationSec > 0) {
    timers.push(
      window.setTimeout(() => {
        canvas.style.transition = `opacity ${FADE_MS}ms`;
        canvas.style.opacity = "0";
        timers.push(
          window.setTimeout(() => cancelAnimationFrame(raf), FADE_MS),
        );
      }, durationSec * 1000),
    );
  }

  return () => {
    cancelAnimationFrame(raf);
    timers.forEach((t) => window.clearTimeout(t));
    window.removeEventListener("resize", resize);
    canvas.style.transition = "";
    canvas.style.opacity = "";
  };
}
