import type { CanvasSize } from "../canvas";
import type { Sounds } from "./sound";

export interface SceneOptions {
  name: string;
  color: string;
  scale: number;
  /** Scene time runs at this multiple of real time; divide sound lengths by it. */
  speed: number;
  sounds: Sounds;
}

/**
 * A scene sets itself up and returns its draw function. That takes the scene
 * time in seconds and returns how visible the scene is, 1 down to 0 as it ends.
 */
export type Scene = (
  ctx: CanvasRenderingContext2D,
  size: CanvasSize,
  options: SceneOptions,
) => (t: number) => number;

export type Face = "run" | "shock" | "scream" | "ghost";

/** Limb angles in radians from straight down; positive swings towards the right. */
export interface Pose {
  lean: number;
  thigh: [number, number];
  knee: [number, number];
  arm: [number, number];
  elbow: [number, number];
  face: Face;
}

export const INK = "#1b1420";
export const GRAVITY = 1100;
export const GHOST_SECONDS = 3.1;

export const clamp01 = (n: number) => Math.min(1, Math.max(0, n));
export const easeOut = (k: number) => 1 - (1 - k) ** 2;
export const easeIn = (k: number) => k * k;
export const lerp = (a: number, b: number, k: number) => a + (b - a) * k;

/** One scene unit in pixels: scenes are laid out for a 720px-tall screen. */
export const unit = (size: CanvasSize, scale: number) =>
  (Math.min(size.width, size.height) / 720) * scale;

export const runPose = (phase: number): Pose => ({
  lean: 0.22,
  thigh: [Math.sin(phase) * 0.95, -Math.sin(phase) * 0.95],
  knee: [
    0.3 + 0.8 * Math.max(0, -Math.cos(phase)),
    0.3 + 0.8 * Math.max(0, Math.cos(phase)),
  ],
  arm: [-Math.sin(phase) * 1.1, Math.sin(phase) * 1.1],
  elbow: [1.3, 1.3],
  face: "run",
});

export const walkPose = (phase: number): Pose => ({
  lean: 0.06,
  thigh: [Math.sin(phase) * 0.5, -Math.sin(phase) * 0.5],
  knee: [
    0.15 + 0.4 * Math.max(0, -Math.cos(phase)),
    0.15 + 0.4 * Math.max(0, Math.cos(phase)),
  ],
  arm: [-Math.sin(phase) * 0.5, Math.sin(phase) * 0.5],
  elbow: [0.3, 0.3],
  face: "run",
});

export const standPose: Pose = {
  lean: 0,
  thigh: [0.12, -0.12],
  knee: [0.05, 0.05],
  arm: [0.25, -0.25],
  elbow: [0.15, -0.15],
  face: "run",
};

export const leapPose: Pose = {
  lean: 0.1,
  thigh: [0.9, -0.7],
  knee: [0.5, 0.9],
  arm: [2.2, -2.2],
  elbow: [0.3, -0.3],
  face: "run",
};

export const hangPose = (t: number): Pose => ({
  lean: 0,
  thigh: [0.25 + Math.sin(t * 5) * 0.2, -0.25 - Math.sin(t * 5) * 0.2],
  knee: [0.2, 0.2],
  arm: [1.5, -1.5],
  elbow: [0, 0],
  face: "shock",
});

export const flailPose = (t: number): Pose => ({
  lean: 0,
  thigh: [0.5 + Math.sin(t * 22) * 0.5, -0.5 + Math.sin(t * 22 + 2) * 0.5],
  knee: [0.4, 0.4],
  arm: [2.7 + Math.sin(t * 26) * 0.45, -2.7 + Math.sin(t * 26 + 1.5) * 0.45],
  elbow: [0, 0],
  face: "scream",
});

const ghostPose: Pose = {
  lean: 0,
  thigh: [0.12, -0.12],
  knee: [0.1, 0.1],
  arm: [0.5, -0.5],
  elbow: [0.2, -0.2],
  face: "ghost",
};

// Body proportions, in scene units
const THIGH = 24;
const SHIN = 24;
const TORSO = 42;
const UPPER_ARM = 19;
const FOREARM = 19;
const HEAD = 15;

/** How far below the hip the lowest foot is, so a pose can be stood on the ground. */
export function footDrop(pose: Pose): number {
  return Math.max(
    ...pose.thigh.map(
      (a, i) => THIGH * Math.cos(a) + SHIN * Math.cos(a - pose.knee[i]),
    ),
  );
}

function drawFace(
  ctx: CanvasRenderingContext2D,
  face: Face,
  x: number,
  y: number,
  r: number,
) {
  ctx.fillStyle = INK;
  ctx.strokeStyle = INK;
  ctx.lineWidth = r * 0.14;
  const eyes = [x + r * 0.05, x + r * 0.55];

  if (face === "run") {
    for (const ex of eyes) {
      ctx.beginPath();
      ctx.arc(ex, y - r * 0.15, r * 0.12, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.beginPath();
    ctx.arc(x + r * 0.3, y + r * 0.2, r * 0.3, 0.2, Math.PI - 0.2);
    ctx.stroke();
  } else if (face === "shock") {
    for (const ex of eyes) {
      ctx.beginPath();
      ctx.arc(ex, y - r * 0.2, r * 0.24, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(ex, y - r * 0.2, r * 0.1, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.beginPath();
    ctx.arc(x + r * 0.3, y + r * 0.45, r * 0.13, 0, Math.PI * 2);
    ctx.fill();
  } else if (face === "scream") {
    for (const ex of eyes) {
      ctx.beginPath();
      ctx.arc(ex, y - r * 0.35, r * 0.13, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.beginPath();
    ctx.ellipse(x + r * 0.3, y + r * 0.3, r * 0.32, r * 0.45, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#e0526a";
    ctx.beginPath();
    ctx.ellipse(x + r * 0.3, y + r * 0.52, r * 0.18, r * 0.16, 0, 0, Math.PI * 2);
    ctx.fill();
  } else {
    // Peaceful closed eyes
    for (const ex of eyes) {
      ctx.beginPath();
      ctx.arc(ex, y - r * 0.2, r * 0.16, 0.3, Math.PI - 0.3);
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.arc(x + r * 0.3, y + r * 0.15, r * 0.22, 0.3, Math.PI - 0.3);
    ctx.stroke();
  }
}

/**
 * Draws the figure with its hip at (x, y), optionally rotated about the hip.
 * Returns how far above the hip the top of the head is when upright.
 */
export function drawFigure(
  ctx: CanvasRenderingContext2D,
  u: number,
  x: number,
  y: number,
  pose: Pose,
  color: string,
  rotation = 0,
): number {
  const point = (px: number, py: number, length: number, angle: number) =>
    [px + Math.sin(angle) * length * u, py + Math.cos(angle) * length * u] as const;

  const up = Math.PI - pose.lean;
  const shoulder = point(0, 0, TORSO, up);
  const head = point(shoulder[0], shoulder[1], HEAD + 5, up);
  const lines: (readonly [number, number])[][] = [[[0, 0], shoulder]];

  pose.thigh.forEach((a, i) => {
    const knee = point(0, 0, THIGH, a);
    lines.push([[0, 0], knee, point(knee[0], knee[1], SHIN, a - pose.knee[i])]);
  });
  pose.arm.forEach((a, i) => {
    const elbow = point(shoulder[0], shoulder[1], UPPER_ARM, a);
    lines.push([
      shoulder,
      elbow,
      point(elbow[0], elbow[1], FOREARM, a + pose.elbow[i]),
    ]);
  });

  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rotation);
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  // Dark pass first so the figure reads over any stream content
  for (const [style, width, headRadius] of [
    [INK, 11, HEAD + 3],
    [color, 6, HEAD],
  ] as const) {
    ctx.strokeStyle = style;
    ctx.fillStyle = style;
    ctx.lineWidth = width * u;
    for (const line of lines) {
      ctx.beginPath();
      line.forEach(([lx, ly], i) => (i ? ctx.lineTo(lx, ly) : ctx.moveTo(lx, ly)));
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.arc(head[0], head[1], headRadius * u, 0, Math.PI * 2);
    ctx.fill();
  }
  drawFace(ctx, pose.face, head[0], head[1], HEAD * u);
  ctx.restore();
  return (TORSO + HEAD * 2 + 5) * u;
}

/** Outlined text, used for the name and for "!" and "?" marks. */
export function drawLabel(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  size: number,
  fill = "#ffffff",
  rotation = 0,
) {
  if (!text || size <= 0) return;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rotation);
  ctx.font = `900 ${size}px "Arial Black", Impact, system-ui, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  ctx.lineJoin = "round";
  ctx.lineWidth = size * 0.28;
  ctx.strokeStyle = INK;
  ctx.strokeText(text, 0, 0);
  ctx.fillStyle = fill;
  ctx.fillText(text, 0, 0);
  ctx.restore();
}

/** A haloed ghost drifting up from (x, y); `since` is seconds since it appeared. */
export function drawGhost(
  ctx: CanvasRenderingContext2D,
  u: number,
  x: number,
  y: number,
  name: string,
  since: number,
) {
  if (since <= 0 || since >= GHOST_SECONDS) return;
  const gx = x + Math.sin(since * 2.2) * 18 * u;
  const gy = y - since * 120 * u;
  ctx.save();
  ctx.globalAlpha =
    clamp01(since / 0.4) * clamp01((GHOST_SECONDS - since) / 0.8) * 0.75;
  const headTop = drawFigure(ctx, u, gx, gy, ghostPose, "#dff4ff");
  ctx.strokeStyle = "#ffd23f";
  ctx.lineWidth = 4 * u;
  ctx.beginPath();
  ctx.ellipse(gx, gy - headTop - 9 * u, 15 * u, 5 * u, 0, 0, Math.PI * 2);
  ctx.stroke();
  drawLabel(ctx, name, gx, gy - headTop - 26 * u, 26 * u);
  ctx.restore();
}

/** Dust billowing up and out from (x, y); k runs 0 to 1. */
export function drawDust(
  ctx: CanvasRenderingContext2D,
  u: number,
  x: number,
  y: number,
  k: number,
  size = 1,
) {
  if (k < 0 || k >= 1) return;
  ctx.save();
  ctx.fillStyle = "#ece6da";
  for (let i = 0; i < 9; i++) {
    const angle = Math.PI * (0.1 + (0.8 * i) / 8);
    const reach = (60 + ((i * 53) % 70)) * u * size * easeOut(k);
    ctx.globalAlpha = (1 - k) * 0.85;
    ctx.beginPath();
    ctx.arc(
      x + Math.cos(angle) * reach * 1.6,
      y - Math.sin(angle) * reach,
      (26 + 34 * k) * u * size,
      0,
      Math.PI * 2,
    );
    ctx.fill();
  }
  ctx.restore();
}

/** Yellow rays bursting upward from an impact at (x, y). */
export function drawImpactRays(
  ctx: CanvasRenderingContext2D,
  u: number,
  x: number,
  y: number,
  since: number,
) {
  if (since < 0 || since >= 0.3) return;
  ctx.save();
  ctx.globalAlpha = 1 - since / 0.3;
  ctx.strokeStyle = "#ffd23f";
  ctx.lineCap = "round";
  ctx.lineWidth = 7 * u;
  for (let i = 0; i < 7; i++) {
    const angle = Math.PI * (1.1 + (0.8 * i) / 6);
    const inner = (40 + since * 300) * u;
    ctx.beginPath();
    ctx.moveTo(x + Math.cos(angle) * inner, y + Math.sin(angle) * inner);
    ctx.lineTo(
      x + Math.cos(angle) * (inner + 50 * u),
      y + Math.sin(angle) * (inner + 50 * u),
    );
    ctx.stroke();
  }
  ctx.restore();
}

/** Jolts everything drawn afterwards; call inside a save/restore. */
export function shake(
  ctx: CanvasRenderingContext2D,
  u: number,
  since: number,
  strength = 12,
) {
  if (since < 0 || since >= 0.45) return;
  const amount = (1 - since / 0.45) * strength * u;
  ctx.translate((Math.random() - 0.5) * amount, (Math.random() - 0.5) * amount);
}

/** Grass strip: bumpy on top, scalloped underneath, optionally drooping over a right-hand edge. */
export function drawGrass(
  ctx: CanvasRenderingContext2D,
  u: number,
  left: number,
  right: number,
  topY: number,
  droop = false,
) {
  const tufts = Math.max(1, Math.ceil((right - left) / (28 * u)));
  const step = (right - left) / tufts;
  const grassTop = topY - 9 * u;
  const grassBottom = topY + 9 * u;
  ctx.beginPath();
  ctx.moveTo(left, grassBottom);
  ctx.lineTo(left, grassTop);
  for (let i = 0; i < tufts; i++) {
    const x = left + i * step;
    // Varies tuft height without needing randomness
    const bump = (7 + ((i * 37) % 11)) * u;
    ctx.quadraticCurveTo(x + step / 2, grassTop - bump, x + step, grassTop);
  }
  if (droop) {
    ctx.quadraticCurveTo(right + 24 * u, topY - 4 * u, right + 13 * u, topY + 20 * u);
    ctx.quadraticCurveTo(right + 4 * u, topY + 14 * u, right, grassBottom);
  } else {
    ctx.lineTo(right, grassBottom);
  }
  for (let i = tufts; i > 0; i--) {
    const x = left + i * step;
    ctx.quadraticCurveTo(x - step / 2, grassBottom + 9 * u, x - step, grassBottom);
  }
  ctx.closePath();
  const grass = ctx.createLinearGradient(0, grassTop - 14 * u, 0, grassBottom + 8 * u);
  grass.addColorStop(0, "#8be05f");
  grass.addColorStop(1, "#3a9631");
  ctx.fillStyle = grass;
  ctx.fill();
  ctx.lineJoin = "round";
  ctx.lineWidth = 3.5 * u;
  ctx.strokeStyle = "#1d5a1b";
  ctx.stroke();
}

/** Flat ground across the bottom of the screen, with its surface at topY. */
export function drawGround(
  ctx: CanvasRenderingContext2D,
  size: CanvasSize,
  u: number,
  topY: number,
) {
  const dirt = ctx.createLinearGradient(0, topY, 0, size.height);
  dirt.addColorStop(0, "#8a5f3f");
  dirt.addColorStop(1, "#3d281a");
  ctx.fillStyle = dirt;
  ctx.fillRect(0, topY, size.width, size.height - topY);
  ctx.strokeStyle = "rgba(0, 0, 0, 0.16)";
  ctx.lineWidth = 4 * u;
  for (let y = topY + 45 * u; y < size.height; y += 50 * u) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.bezierCurveTo(
      size.width * 0.3, y - 14 * u,
      size.width * 0.7, y + 14 * u,
      size.width, y - 4 * u,
    );
    ctx.stroke();
  }
  drawGrass(ctx, u, -30 * u, size.width + 30 * u, topY);
}
