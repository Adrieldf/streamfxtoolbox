import {
  GHOST_SECONDS,
  INK,
  clamp01,
  drawFigure,
  drawGhost,
  drawLabel,
  easeIn,
  easeOut,
  footDrop,
  hangPose,
  leapPose,
  lerp,
  runPose,
  shake,
  unit,
  type Scene,
} from "../shared";

const RUN_START = 0.3;
const JUMP_SECONDS = 0.75;

function drawDock(
  ctx: CanvasRenderingContext2D,
  u: number,
  endX: number,
  y: number,
  height: number,
) {
  ctx.lineJoin = "round";
  ctx.strokeStyle = INK;
  ctx.lineWidth = 4 * u;
  ctx.fillStyle = "#7a5230";
  for (const x of [endX - 30 * u, endX * 0.45]) {
    ctx.beginPath();
    ctx.rect(x - 9 * u, y + 10 * u, 18 * u, height);
    ctx.fill();
    ctx.stroke();
  }
  ctx.fillStyle = "#a8733f";
  ctx.beginPath();
  ctx.rect(-30 * u, y, endX + 30 * u, 18 * u);
  ctx.fill();
  ctx.stroke();
  ctx.lineWidth = 2.5 * u;
  for (let x = endX - 46 * u; x > 0; x -= 46 * u) {
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x, y + 18 * u);
    ctx.stroke();
  }
}

function drawWater(
  ctx: CanvasRenderingContext2D,
  u: number,
  width: number,
  height: number,
  y: number,
  t: number,
) {
  const wave = (x: number) => y + Math.sin(x / (60 * u) + t * 2) * 5 * u;
  const water = ctx.createLinearGradient(0, y, 0, height);
  water.addColorStop(0, "rgba(70, 175, 228, 0.92)");
  water.addColorStop(1, "rgba(16, 70, 120, 0.97)");
  ctx.fillStyle = water;
  ctx.beginPath();
  ctx.moveTo(0, height);
  for (let x = 0; x <= width + 40 * u; x += 40 * u) ctx.lineTo(x, wave(x));
  ctx.lineTo(width, height);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#c8ecff";
  ctx.lineWidth = 4 * u;
  ctx.beginPath();
  for (let x = 0; x <= width + 40 * u; x += 40 * u) ctx.lineTo(x, wave(x));
  ctx.stroke();
}

function drawFin(ctx: CanvasRenderingContext2D, u: number, x: number, y: number) {
  ctx.fillStyle = "#5f7388";
  ctx.strokeStyle = INK;
  ctx.lineJoin = "round";
  ctx.lineWidth = 4 * u;
  ctx.beginPath();
  ctx.moveTo(x - 36 * u, y + 24 * u);
  ctx.quadraticCurveTo(x - 10 * u, y - 30 * u, x + 8 * u, y - 62 * u);
  ctx.quadraticCurveTo(x + 18 * u, y - 20 * u, x + 32 * u, y + 24 * u);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
}

/** The shark, head-on and very pleased with itself, centred on (x, y). */
function drawSharkHead(ctx: CanvasRenderingContext2D, u: number, x: number, y: number) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(u, u);
  ctx.lineJoin = "round";
  ctx.strokeStyle = INK;
  ctx.lineWidth = 4;
  ctx.fillStyle = "#6f8399";
  ctx.beginPath();
  ctx.moveTo(-64, 110);
  ctx.bezierCurveTo(-64, -10, -30, -80, 0, -100);
  ctx.bezierCurveTo(30, -80, 64, -10, 64, 110);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "#e8eef3";
  ctx.beginPath();
  ctx.moveTo(-42, 110);
  ctx.bezierCurveTo(-42, 30, -20, -6, 0, -10);
  ctx.bezierCurveTo(20, -6, 42, 30, 42, 110);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = INK;
  for (const ex of [-27, 27]) {
    ctx.beginPath();
    ctx.arc(ex, -34, 6, 0, Math.PI * 2);
    ctx.fill();
  }
  // Grin full of teeth
  ctx.fillStyle = "#7a1f2b";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(0, 4, 32, 0, Math.PI);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "#ffffff";
  for (let i = -2; i <= 2; i++) {
    ctx.beginPath();
    ctx.moveTo(i * 12 - 6, 5);
    ctx.lineTo(i * 12, 17);
    ctx.lineTo(i * 12 + 6, 5);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}

function drawSplash(
  ctx: CanvasRenderingContext2D,
  u: number,
  x: number,
  y: number,
  since: number,
  size: number,
) {
  if (since < 0 || since >= 0.9) return;
  ctx.save();
  ctx.fillStyle = "#e3f6ff";
  ctx.globalAlpha = 1 - since / 0.9;
  for (let i = 0; i < 10; i++) {
    const vx = (i - 4.5) * 42 * u * size;
    const vy = -(260 + ((i * 37) % 140)) * u * size;
    ctx.beginPath();
    ctx.arc(
      x + vx * since,
      y + vy * since + 0.5 * 1100 * u * since ** 2,
      (4 + (i % 3) * 2) * u * size,
      0,
      Math.PI * 2,
    );
    ctx.fill();
  }
  ctx.restore();
}

/** A cannonball off the dock, into water that already has a resident. */
export const shark: Scene = (ctx, size, o) => {
  const runSeconds = Math.min(2, Math.max(1, size.width / 900));
  const jumpAt = RUN_START + runSeconds;
  const splashAt = jumpAt + JUMP_SECONDS;
  const surfaceAt = splashAt + 0.5;
  const noticeAt = surfaceAt + 0.6;
  const chompAt = noticeAt + 1;
  const ghostAt = chompAt + 1.4;
  const endAt = ghostAt + GHOST_SECONDS + 0.2;
  let splashed = false;
  let screamed = false;
  let chomped = false;

  return (t) => {
    const { width, height } = size;
    const u = unit(size, o.scale);
    const dockY = height * 0.6;
    const dockEnd = width * 0.4;
    const waterY = height * 0.72;
    const entryX = dockEnd + 150 * u;
    const sinceChomp = t - chompAt;

    if (sinceChomp >= 0) shake(ctx, u, sinceChomp, 14);
    drawDock(ctx, u, dockEnd, dockY, height);

    // Everything from here to drawWater is partly hidden by the water
    const cruise = (time: number) => width * 0.82 + Math.sin(time * 0.9) * width * 0.08;
    if (sinceChomp < 0) {
      const rush = easeIn(clamp01((t - noticeAt) / (chompAt - noticeAt)));
      const finX = t < noticeAt ? cruise(t) : lerp(cruise(noticeAt), entryX + 40 * u, rush);
      drawFin(ctx, u, finX, waterY);
    }

    let labelX = entryX;
    let labelY = 0;
    let showLabel = true;
    if (t < jumpAt) {
      const pose = runPose(t * 16);
      const hipX = lerp(-60 * u, dockEnd - 10 * u, clamp01((t - RUN_START) / runSeconds));
      const hipY = dockY - footDrop(pose) * u;
      const headTop = drawFigure(ctx, u, hipX, hipY, pose, o.color);
      labelX = hipX;
      labelY = hipY - headTop - 16 * u;
    } else if (t < splashAt) {
      const k = (t - jumpAt) / JUMP_SECONDS;
      const hipX = lerp(dockEnd - 10 * u, entryX, k);
      const hipY =
        lerp(dockY - footDrop(leapPose) * u, waterY + 40 * u, k) - 4 * 120 * u * k * (1 - k);
      const headTop = drawFigure(ctx, u, hipX, hipY, leapPose, o.color, k * 5);
      labelX = hipX;
      labelY = hipY - headTop - 16 * u;
    } else if (sinceChomp < 0) {
      // Bobs back up, chest-deep, and then spots the fin
      const rise = easeOut(clamp01((t - surfaceAt) / 0.3));
      const hipY = waterY + lerp(140, 34, rise) * u + Math.sin(t * 5) * 3 * u;
      const noticed = t >= noticeAt;
      const pose = noticed ? hangPose(t) : { ...hangPose(t), face: "run" as const };
      const headTop = drawFigure(ctx, u, entryX, hipY, pose, o.color);
      labelY = hipY - headTop - 16 * u;
      showLabel = t >= surfaceAt;
      if (noticed) {
        const pop = easeOut(clamp01((t - noticeAt) / 0.12));
        drawLabel(ctx, "!", entryX + 62 * u, hipY - headTop + 46 * u, 76 * u * pop, "#ffd23f");
        if (!screamed) {
          screamed = true;
          o.sounds.scream(1 / o.speed);
        }
      }
    } else {
      // The shark comes up to gloat, then sinks away; the name went with the figure
      const up =
        easeOut(clamp01((sinceChomp - 0.25) / 0.3)) *
        (1 - clamp01((sinceChomp - 1.8) / 0.3));
      drawSharkHead(ctx, u, entryX, waterY + lerp(150, 10, up) * u);
      showLabel = false;
    }

    drawWater(ctx, u, width, height, waterY, t);

    if (t >= splashAt && !splashed) {
      splashed = true;
      o.sounds.sizzle();
    }
    drawSplash(ctx, u, entryX, waterY, t - splashAt, 1);
    if (sinceChomp >= 0) {
      if (!chomped) {
        chomped = true;
        o.sounds.thud();
      }
      drawSplash(ctx, u, entryX, waterY, sinceChomp, 1.6);
      if (sinceChomp < 0.8) {
        const pop = easeOut(clamp01(sinceChomp / 0.12));
        drawLabel(ctx, "CHOMP!", entryX, waterY - 150 * u, 60 * u * pop, "#ff5d5d", -0.08);
      }
    }
    if (showLabel) drawLabel(ctx, o.name, labelX, labelY, 30 * u);
    drawGhost(ctx, u, entryX, waterY + 30 * u, o.name, t - ghostAt);
    return clamp01((endAt - t) / 0.6);
  };
};
