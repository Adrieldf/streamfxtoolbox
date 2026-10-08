import {
  GHOST_SECONDS,
  GRAVITY,
  INK,
  clamp01,
  drawDust,
  drawFigure,
  drawGhost,
  drawGround,
  drawLabel,
  easeOut,
  flailPose,
  footDrop,
  hangPose,
  lerp,
  shake,
  standPose,
  unit,
  walkPose,
  type Pose,
  type Scene,
} from "../shared";

const WALK_START = 0.3;
const HALF = 58;

function drawSign(ctx: CanvasRenderingContext2D, u: number, x: number, groundY: number) {
  ctx.lineJoin = "round";
  ctx.strokeStyle = INK;
  ctx.lineWidth = 3 * u;
  ctx.fillStyle = "#8a5a36";
  ctx.beginPath();
  ctx.rect(x - 4 * u, groundY - 70 * u, 8 * u, 74 * u);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "#fff4d6";
  ctx.beginPath();
  ctx.rect(x - 62 * u, groundY - 124 * u, 124 * u, 58 * u);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = INK;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = `900 ${19 * u}px "Arial Black", Impact, sans-serif`;
  ctx.fillText("FREE WIFI", x, groundY - 104 * u);
  ctx.fillText("→", x, groundY - 82 * u);
}

/** Lured onto a suspicious hatch by a sign promising free wifi. */
export const trapdoor: Scene = (ctx, size, o) => {
  const walkSeconds = Math.min(2.4, Math.max(1.4, size.width / 700));
  const stopAt = WALK_START + walkSeconds;
  const openAt = stopAt + 1;
  const fallAt = openAt + 0.55;
  let screamed = false;
  let closeAt: number | null = null;
  let thudded = false;

  return (t) => {
    const { width, height } = size;
    const u = unit(size, o.scale);
    const groundTop = height * 0.8;
    const groundY = groundTop - 6 * u;
    const x = width * 0.5;
    const half = HALF * u;
    const thudAt = closeAt === null ? null : closeAt + 0.5;
    const ghostAt = thudAt === null ? null : thudAt + 0.4;

    if (thudAt !== null) shake(ctx, u, t - thudAt, 10);
    drawGround(ctx, size, u, groundTop);
    drawSign(ctx, u, x - 160 * u, groundY);

    // 0 = shut, 1 = hanging open
    const open =
      closeAt === null
        ? clamp01((t - openAt) / 0.15)
        : 1 - clamp01((t - closeAt) / 0.25);
    if (open > 0) {
      const hole = ctx.createLinearGradient(0, groundTop, 0, height);
      hole.addColorStop(0, "#241812");
      hole.addColorStop(1, "#000000");
      ctx.fillStyle = hole;
      ctx.fillRect(x - half, groundTop - 12 * u, half * 2, height - groundTop + 12 * u);
    }

    if (closeAt === null) {
      let pose: Pose = standPose;
      let hipX = x;
      let hipY: number;
      let labelDrop = 0;
      if (t < stopAt) {
        pose = walkPose(t * 9);
        hipX = lerp(-60 * u, x, clamp01((t - WALK_START) / walkSeconds));
        hipY = groundY - footDrop(pose) * u;
      } else if (t < openAt) {
        hipY = groundY - footDrop(pose) * u;
      } else if (t < fallAt) {
        pose = hangPose(t - openAt);
        hipY = groundY - footDrop(standPose) * u;
      } else {
        const fall = t - fallAt;
        pose = flailPose(fall);
        hipY = groundY - footDrop(standPose) * u + 0.5 * GRAVITY * u * fall ** 2;
        labelDrop = 0.5 * GRAVITY * u * Math.max(0, fall - 0.25) ** 2;
        if (!screamed) {
          screamed = true;
          o.sounds.scream(1.1 / o.speed);
        }
        if (hipY > height + 400 * u) closeAt = t;
      }

      // Only visible above ground or inside the hole
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, 0, width, groundTop - 10 * u);
      ctx.rect(x - half, groundTop - 10 * u, half * 2, height);
      ctx.clip();
      const headTop = drawFigure(ctx, u, hipX, hipY, pose, o.color);
      const standTop = groundY - footDrop(standPose) * u - headTop - 16 * u;
      drawLabel(ctx, o.name, hipX, t < fallAt ? hipY - headTop - 16 * u : standTop + labelDrop, 30 * u);
      ctx.restore();
      if (t >= openAt && t < fallAt) {
        const pop = easeOut(clamp01((t - openAt) / 0.12));
        drawLabel(ctx, "!", x + 62 * u, hipY - headTop + 46 * u, 76 * u * pop, "#ffd23f");
      }
    }

    // The two flaps, hinged at the edges of the hole
    ctx.lineCap = "butt";
    for (const side of [-1, 1]) {
      const angle = open * 1.45;
      for (const [style, w] of [
        [INK, 16],
        ["#a8733f", 10],
      ] as const) {
        ctx.strokeStyle = style;
        ctx.lineWidth = w * u;
        ctx.beginPath();
        ctx.moveTo(x + side * half, groundTop - 4 * u);
        ctx.lineTo(
          x + side * half - side * Math.cos(angle) * (half - 2 * u),
          groundTop - 4 * u + Math.sin(angle) * (half - 2 * u),
        );
        ctx.stroke();
      }
    }

    if (thudAt !== null && t >= thudAt) {
      if (!thudded) {
        thudded = true;
        o.sounds.thud();
      }
      drawDust(ctx, u, x, groundTop, (t - thudAt) / 0.8, 0.45);
    }
    if (ghostAt === null) return 1;
    drawGhost(ctx, u, x, groundY - 10 * u, o.name, t - ghostAt);
    return clamp01((ghostAt + GHOST_SECONDS + 0.2 - t) / 0.6);
  };
};
