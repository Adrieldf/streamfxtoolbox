import {
  GHOST_SECONDS,
  INK,
  clamp01,
  drawFigure,
  drawGhost,
  drawGround,
  drawLabel,
  easeOut,
  footDrop,
  lerp,
  shake,
  standPose,
  unit,
  walkPose,
  type Pose,
  type Scene,
} from "../shared";

const WALK_START = 0.3;
const CLOUD_SECONDS = 1.4;
const FLASH_SECONDS = 0.4;
const CHARRED = "#3a3438";

const zappedPose: Pose = {
  lean: 0,
  thigh: [0.45, -0.45],
  knee: [0, 0],
  arm: [1.9, -1.9],
  elbow: [0.5, -0.5],
  face: "shock",
};

function drawCloud(
  ctx: CanvasRenderingContext2D,
  u: number,
  x: number,
  y: number,
  lit: boolean,
) {
  const puffs = [
    [-72, 12, 38],
    [-30, -14, 46],
    [22, -20, 52],
    [68, 6, 40],
    [0, 18, 44],
  ];
  for (const [style, grow] of [
    [INK, 4],
    [lit ? "#c9cee0" : "#4b5060", 0],
  ] as const) {
    ctx.fillStyle = style;
    for (const [dx, dy, r] of puffs) {
      ctx.beginPath();
      ctx.arc(x + dx * u, y + dy * u, (r + grow) * u, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  // Angry eyebrows
  ctx.strokeStyle = INK;
  ctx.lineCap = "round";
  ctx.lineWidth = 5 * u;
  for (const side of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(x + side * 34 * u, y - 16 * u);
    ctx.lineTo(x + side * 10 * u, y - 4 * u);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(x + side * 22 * u, y + 6 * u, 4 * u, 0, Math.PI * 2);
    ctx.fillStyle = INK;
    ctx.fill();
  }
}

function drawBolt(
  ctx: CanvasRenderingContext2D,
  u: number,
  fromX: number,
  fromY: number,
  toX: number,
  toY: number,
) {
  const offsets = [0, 26, -18, 22, -12, 0];
  ctx.lineJoin = "miter";
  ctx.lineCap = "round";
  for (const [style, width] of [
    [INK, 22],
    ["#ffd23f", 14],
    ["#ffffff", 5],
  ] as const) {
    ctx.strokeStyle = style;
    ctx.lineWidth = width * u;
    ctx.beginPath();
    offsets.forEach((offset, i) => {
      const k = i / (offsets.length - 1);
      const x = lerp(fromX, toX, k) + offset * u;
      const y = lerp(fromY, toY, k);
      if (i) ctx.lineTo(x, y);
      else ctx.moveTo(x, y);
    });
    ctx.stroke();
  }
}

/** A small, personal storm cloud arrives. */
export const lightning: Scene = (ctx, size, o) => {
  const walkSeconds = Math.min(2.4, Math.max(1.4, size.width / 700));
  const stopAt = WALK_START + walkSeconds;
  const cloudAt = stopAt - 0.5;
  const lookAt = cloudAt + CLOUD_SECONDS - 0.1;
  const strikeAt = cloudAt + CLOUD_SECONDS + 0.7;
  const crumbleAt = strikeAt + 1.6;
  const pileAt = crumbleAt + 0.5;
  const ghostAt = pileAt + 0.4;
  const endAt = ghostAt + GHOST_SECONDS + 0.2;
  let struck = false;

  return (t) => {
    const { width, height } = size;
    const u = unit(size, o.scale);
    const groundTop = height * 0.8;
    const groundY = groundTop - 6 * u;
    const x = width * 0.5;
    const since = t - strikeAt;

    if (since >= 0) shake(ctx, u, since, 14);
    drawGround(ctx, size, u, groundTop);

    const arrive = easeOut(clamp01((t - cloudAt) / CLOUD_SECONDS));
    const cloudX = lerp(width + 220 * u, x, arrive) + Math.sin(t * 1.5) * 6 * u;
    const cloudY = height * 0.2 + Math.sin(t * 2.3) * 4 * u;
    const flashing = since >= 0 && since < FLASH_SECONDS;
    const flicker = flashing && Math.floor(since * 30) % 2 === 0;
    const standY = groundY - footDrop(standPose) * u;

    if (t < strikeAt) {
      let pose: Pose = standPose;
      let hipX = x;
      if (t < stopAt) {
        pose = walkPose(t * 9);
        hipX = lerp(-60 * u, x, clamp01((t - WALK_START) / walkSeconds));
      } else if (t >= lookAt) {
        pose = { ...standPose, face: "shock" };
      }
      const hipY = groundY - footDrop(pose) * u;
      const headTop = drawFigure(ctx, u, hipX, hipY, pose, o.color);
      drawLabel(ctx, o.name, hipX, hipY - headTop - 16 * u, 30 * u);
      if (t >= lookAt) {
        const pop = easeOut(clamp01((t - lookAt) / 0.15));
        drawLabel(ctx, "?", hipX + 62 * u, hipY - headTop + 46 * u, 76 * u * pop, "#ffd23f");
      }
    } else if (flashing) {
      if (!struck) {
        struck = true;
        o.sounds.thud();
        o.sounds.sizzle();
        o.sounds.scream(0.9 / o.speed);
      }
      if (flicker) {
        ctx.fillStyle = "rgba(255, 255, 255, 0.3)";
        ctx.fillRect(0, 0, width, height);
      }
      const hipY = groundY - footDrop(zappedPose) * u;
      // Alternates between lit up and silhouette, like a cartoon x-ray
      const headTop = drawFigure(ctx, u, x, hipY, zappedPose, flicker ? "#fff7c2" : INK);
      drawBolt(ctx, u, cloudX - 10 * u, cloudY + 40 * u, x, hipY - headTop);
      drawLabel(ctx, o.name, x, hipY - headTop - 16 * u, 30 * u, flicker ? "#ffd23f" : "#ffffff");
    } else if (t < pileAt) {
      // Charred and smoking for a moment, then crumbles into a heap
      const k = clamp01((t - crumbleAt) / (pileAt - crumbleAt));
      const pose: Pose = { ...standPose, arm: [1.1, -1.1], face: "shock" };
      ctx.save();
      ctx.translate(x, groundY);
      ctx.scale(1 + k * 0.6, 1 - k * 0.88);
      const headTop = drawFigure(ctx, u, 0, standY - groundY, pose, CHARRED);
      ctx.restore();
      const top = lerp(standY - headTop - 16 * u, groundY - 30 * u, k);
      drawLabel(ctx, o.name, x, top, 30 * u);

      ctx.fillStyle = "#b9b2ad";
      for (let i = 0; i < 4; i++) {
        const rise = (t * 0.7 + i / 4) % 1;
        ctx.globalAlpha = (1 - rise) * 0.5 * (1 - k);
        ctx.beginPath();
        ctx.arc(
          x + Math.sin(i * 2 + t * 2) * 16 * u,
          standY - headTop - rise * 90 * u,
          (8 + 14 * rise) * u,
          0,
          Math.PI * 2,
        );
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    } else {
      ctx.fillStyle = CHARRED;
      ctx.strokeStyle = INK;
      ctx.lineWidth = 4 * u;
      ctx.beginPath();
      ctx.ellipse(x, groundY + 4 * u, 48 * u, 22 * u, 0, Math.PI, Math.PI * 2);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      drawLabel(ctx, o.name, x, groundY - 30 * u, 30 * u, "#ffffff", 0.05);
      drawGhost(ctx, u, x, groundY - 40 * u, o.name, t - ghostAt);
    }

    drawCloud(ctx, u, cloudX, cloudY, flicker);
    return clamp01((endAt - t) / 0.6);
  };
};
