"use client";

import { useEffect, useRef } from "react";
import { fullscreen, runCanvas } from "../canvas";
import { withStartSound } from "../sound";
import type { EffectProps } from "../types";

interface LightsParams {
  layout: "top" | "swag" | "arch" | "frame";
  droop: number;
  swags: number;
  margin: number;
  bulb: "classic" | "round" | "mini" | "star";
  size: number;
  spacing: number;
  colors: keyof typeof PALETTES | "rainbow" | "custom";
  color: string;
  pattern:
    | "steady"
    | "twinkle"
    | "alternate"
    | "chase"
    | "wave"
    | "fade"
    | "flash"
    | "cycle";
  hold: number;
  speed: number;
  glow: number;
  wire: string;
  wireWidth: number;
  sway: boolean;
  sound: string;
  volume: number;
  soundLoop: boolean;
  duration: number;
}

type Point = [number, number];

interface Bulb {
  x: number;
  y: number;
  /** Direction the bulb points, away from the wire */
  angle: number;
  /** Colour, and the same colour fully transparent for the glow's outer edge */
  solid: string;
  clear: string;
  /** 0 – 1, fixed per bulb, for the twinkle pattern */
  random: number;
}

const PALETTES = {
  classic: ["#ff3b3b", "#3ddc52", "#3d8bff", "#ffd23f", "#ff8a1f"],
  warm: ["#ffd9a0"],
  ice: ["#bfe6ff", "#ffffff", "#6fb8ff"],
  redgreen: ["#ff3b3b", "#3ddc52"],
  candy: ["#ff3b3b", "#ffffff"],
};

const DIM = 0.12;

// The order the "cycle" pattern plays the others in
const CYCLE = ["twinkle", "chase", "alternate", "wave", "fade", "flash", "steady"] as const;

function colorOf(p: LightsParams, i: number): Pick<Bulb, "solid" | "clear"> {
  if (p.colors === "rainbow") {
    const hue = (i * 28) % 360;
    return {
      solid: `hsl(${hue}, 100%, 58%)`,
      clear: `hsla(${hue}, 100%, 58%, 0)`,
    };
  }
  const hex =
    p.colors === "custom"
      ? p.color
      : PALETTES[p.colors][i % PALETTES[p.colors].length];
  const [r, g, b] = [1, 3, 5].map((at) => parseInt(hex.slice(at, at + 2), 16));
  return { solid: hex, clear: `rgba(${r}, ${g}, ${b}, 0)` };
}

/** The wire as a polyline. Bulbs hang on its right-hand side, facing into the screen. */
function wirePath(
  p: LightsParams,
  width: number,
  height: number,
): { points: Point[]; closed: boolean } {
  const m = p.margin;
  if (p.layout === "top") {
    return { points: [[0, m], [width, m]], closed: false };
  }
  if (p.layout === "swag") {
    const points: Point[] = [];
    const span = width / p.swags;
    for (let s = 0; s < p.swags; s++) {
      for (let i = s ? 1 : 0; i <= 24; i++) {
        const k = i / 24;
        points.push([(s + k) * span, m + p.droop * 4 * k * (1 - k)]);
      }
    }
    return { points, closed: false };
  }
  if (p.layout === "arch") {
    return {
      points: [[m, height], [m, m], [width - m, m], [width - m, height]],
      closed: false,
    };
  }
  return {
    points: [[m, m], [width - m, m], [width - m, height - m], [m, height - m]],
    closed: true,
  };
}

/** Places bulbs at even distances along the wire. */
function placeBulbs(p: LightsParams, points: Point[], closed: boolean): Bulb[] {
  const path = closed ? [...points, points[0]] : points;
  const lengths = path.slice(1).map(([x, y], i) => Math.hypot(x - path[i][0], y - path[i][1]));
  const total = lengths.reduce((sum, l) => sum + l, 0);
  const count = Math.max(1, Math.round(total / p.spacing));
  const step = total / count;

  const bulbs: Bulb[] = [];
  let segment = 0;
  let before = 0;
  for (let i = 0; i < count; i++) {
    // Open wires start half a step in so both ends look the same
    const distance = (closed ? i : i + 0.5) * step;
    while (segment < lengths.length - 1 && before + lengths[segment] < distance) {
      before += lengths[segment++];
    }
    const [ax, ay] = path[segment];
    const [bx, by] = path[segment + 1];
    const k = (distance - before) / lengths[segment];
    bulbs.push({
      x: ax + (bx - ax) * k,
      y: ay + (by - ay) * k,
      // On a drooping wire gravity wins and bulbs hang straight down
      angle:
        p.layout === "swag"
          ? Math.PI / 2
          : Math.atan2(by - ay, bx - ax) + Math.PI / 2,
      random: (Math.sin(i * 127.1) * 43758.5453) % 1,
      ...colorOf(p, i),
    });
  }
  bulbs.forEach((b) => (b.random = Math.abs(b.random)));
  return bulbs;
}

/** How bright bulb i is right now, from DIM to 1. */
function brightness(p: LightsParams, bulb: Bulb, i: number, time: number): number {
  const t = time * p.speed;
  const pattern =
    p.pattern === "cycle"
      ? CYCLE[Math.floor(time / (p.hold > 0 ? p.hold : 8)) % CYCLE.length]
      : p.pattern;
  switch (pattern) {
    case "steady":
      return 1;
    case "twinkle": {
      const wave = Math.sin(t * (2 + bulb.random * 4) + bulb.random * 100);
      return DIM + (1 - DIM) * (0.5 + 0.5 * wave) ** 0.6;
    }
    case "alternate":
      return (i + Math.floor(t * 1.5)) % 2 === 0 ? 1 : DIM;
    case "chase": {
      // A lit bulb every 6, each trailing a fading tail
      const behind = (((t * 8 - i) % 6) + 6) % 6;
      return Math.max(DIM, 1 - behind / 3);
    }
    case "wave":
      return DIM + (1 - DIM) * (0.5 + 0.5 * Math.sin(i * 0.5 - t * 3));
    case "fade":
      return DIM + (1 - DIM) * (0.5 + 0.5 * Math.sin(t * 2));
    case "flash":
      return Math.floor(t * 1.5) % 2 === 0 ? 1 : DIM;
    default:
      return 1;
  }
}

/** Traces the glass of a bulb pointing along +y from its socket at the origin. */
function bulbShape(ctx: CanvasRenderingContext2D, shape: LightsParams["bulb"], r: number) {
  ctx.beginPath();
  if (shape === "round") {
    ctx.arc(0, r * 1.25, r, 0, Math.PI * 2);
  } else if (shape === "mini") {
    ctx.moveTo(-r * 0.3, r * 0.3);
    ctx.bezierCurveTo(-r * 0.55, r * 1.2, -r * 0.3, r * 2, 0, r * 2.4);
    ctx.bezierCurveTo(r * 0.3, r * 2, r * 0.55, r * 1.2, r * 0.3, r * 0.3);
  } else if (shape === "star") {
    for (let i = 0; i < 10; i++) {
      const radius = i % 2 ? r * 0.5 : r * 1.15;
      const angle = Math.PI / 2 + (i * Math.PI) / 5;
      ctx.lineTo(Math.cos(angle) * radius, r * 1.4 + Math.sin(angle) * radius);
    }
  } else {
    ctx.moveTo(-r * 0.4, r * 0.3);
    ctx.bezierCurveTo(-r * 1.15, r * 0.9, -r * 0.8, r * 2.1, 0, r * 2.7);
    ctx.bezierCurveTo(r * 0.8, r * 2.1, r * 1.15, r * 0.9, r * 0.4, r * 0.3);
  }
  ctx.closePath();
}

// Where the middle of each bulb's glass sits along its axis, in bulb sizes
const GLASS_CENTRE = { classic: 1.45, round: 1.25, mini: 1.3, star: 1.4 };

export default function Lights({ params }: EffectProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const p = params as unknown as LightsParams;

    return withStartSound(
      p,
      runCanvas(
        canvas,
        (ctx, size) => {
          let laidOutFor = "";
          let wire: ReturnType<typeof wirePath> = { points: [], closed: false };
          let bulbs: Bulb[] = [];

          return (_dt, time) => {
            const { width, height } = size;
            if (laidOutFor !== `${width}x${height}`) {
              laidOutFor = `${width}x${height}`;
              wire = wirePath(p, width, height);
              bulbs = placeBulbs(p, wire.points, wire.closed);
            }
            ctx.clearRect(0, 0, width, height);

            // Wire, with a soft dark edge so it shows on any background
            ctx.lineCap = "round";
            ctx.lineJoin = "round";
            for (const [style, extra] of [
              ["rgba(0, 0, 0, 0.35)", 2],
              [p.wire, 0],
            ] as const) {
              ctx.strokeStyle = style;
              ctx.lineWidth = p.wireWidth + extra;
              ctx.beginPath();
              wire.points.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
              if (wire.closed) ctx.closePath();
              ctx.stroke();
            }

            const r = p.size;
            const centre = GLASS_CENTRE[p.bulb] * r;
            const lit = bulbs.map((bulb, i) => brightness(p, bulb, i, time));
            const angleOf = (bulb: Bulb, i: number) =>
              bulb.angle - Math.PI / 2 + (p.sway ? Math.sin(time * 1.4 + i * 0.9) * 0.1 : 0);

            // Glows first, blended additively, so bulbs sit on top of every halo
            if (p.glow > 0) {
              ctx.globalCompositeOperation = "lighter";
              bulbs.forEach((bulb, i) => {
                const angle = angleOf(bulb, i);
                const gx = bulb.x - Math.sin(angle) * centre;
                const gy = bulb.y + Math.cos(angle) * centre;
                const radius = r * 3.6 * p.glow;
                const glow = ctx.createRadialGradient(gx, gy, 0, gx, gy, radius);
                glow.addColorStop(0, bulb.solid);
                glow.addColorStop(1, bulb.clear);
                ctx.globalAlpha = 0.55 * lit[i];
                ctx.fillStyle = glow;
                ctx.fillRect(gx - radius, gy - radius, radius * 2, radius * 2);
              });
              ctx.globalCompositeOperation = "source-over";
              ctx.globalAlpha = 1;
            }

            bulbs.forEach((bulb, i) => {
              ctx.save();
              ctx.translate(bulb.x, bulb.y);
              ctx.rotate(angleOf(bulb, i));

              // Socket
              ctx.fillStyle = p.wire;
              ctx.strokeStyle = "rgba(0, 0, 0, 0.45)";
              ctx.lineWidth = 1.5;
              ctx.beginPath();
              ctx.rect(-r * 0.4, -r * 0.15, r * 0.8, r * 0.6);
              ctx.fill();
              ctx.stroke();

              // Glass: its colour, darkened when dim, with a hot centre when lit
              bulbShape(ctx, p.bulb, r);
              ctx.fillStyle = bulb.solid;
              ctx.fill();
              ctx.fillStyle = `rgba(0, 0, 0, ${(1 - lit[i]) * 0.6})`;
              ctx.fill();
              const hot = ctx.createRadialGradient(0, centre, 0, 0, centre, r * 1.1);
              hot.addColorStop(0, `rgba(255, 255, 255, ${0.85 * lit[i]})`);
              hot.addColorStop(1, "rgba(255, 255, 255, 0)");
              ctx.fillStyle = hot;
              ctx.fill();
              ctx.strokeStyle = "rgba(0, 0, 0, 0.35)";
              ctx.stroke();

              // Reflection on the glass
              ctx.fillStyle = "rgba(255, 255, 255, 0.45)";
              ctx.beginPath();
              ctx.ellipse(-r * 0.3, centre - r * 0.35, r * 0.14, r * 0.3, 0.5, 0, Math.PI * 2);
              ctx.fill();
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
