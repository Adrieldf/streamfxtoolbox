import {
  GHOST_SECONDS,
  GRAVITY,
  INK,
  clamp01,
  drawDust,
  drawFigure,
  drawGhost,
  drawGrass,
  drawImpactRays,
  drawLabel,
  easeOut,
  flailPose,
  footDrop,
  hangPose,
  leapPose,
  runPose,
  shake,
  unit,
  type Pose,
  type Scene,
} from "../shared";

const RUN_START = 0.3;
const JUMP_SECONDS = 0.55;
const HANG_SECONDS = 1.2;
const GHOST_DELAY = 0.5;
const END_AFTER_IMPACT = GHOST_DELAY + GHOST_SECONDS + 0.2;

function drawCliff(
  ctx: CanvasRenderingContext2D,
  height: number,
  u: number,
  edgeX: number,
  topY: number,
) {
  const left = -30 * u;
  const rock = new Path2D();
  rock.moveTo(left, topY);
  rock.lineTo(edgeX, topY);
  rock.quadraticCurveTo(edgeX + 18 * u, topY + 6 * u, edgeX + 6 * u, topY + 36 * u);
  rock.lineTo(edgeX - 16 * u, topY + 95 * u);
  rock.lineTo(edgeX - 4 * u, topY + 155 * u);
  rock.lineTo(edgeX - 36 * u, topY + 250 * u);
  rock.lineTo(edgeX - 22 * u, height + 30 * u);
  rock.lineTo(left, height + 30 * u);
  rock.closePath();

  const side = ctx.createLinearGradient(edgeX - 320 * u, 0, edgeX, 0);
  side.addColorStop(0, "#96694a");
  side.addColorStop(1, "#5d3b27");
  ctx.fillStyle = side;
  ctx.fill(rock);
  const depth = ctx.createLinearGradient(0, topY, 0, height);
  depth.addColorStop(0, "rgba(0, 0, 0, 0)");
  depth.addColorStop(1, "rgba(0, 0, 0, 0.5)");
  ctx.fillStyle = depth;
  ctx.fill(rock);

  // Rock layers and a lit facet on the cliff face
  ctx.save();
  ctx.clip(rock);
  ctx.lineWidth = 4 * u;
  ctx.strokeStyle = "rgba(0, 0, 0, 0.16)";
  for (let i = 1; i <= 5; i++) {
    const y = topY + i * 55 * u;
    ctx.beginPath();
    ctx.moveTo(left, y + 14 * u);
    ctx.bezierCurveTo(
      edgeX * 0.3, y - 16 * u,
      edgeX * 0.65, y + 22 * u,
      edgeX + 20 * u, y - 8 * u,
    );
    ctx.stroke();
  }
  ctx.fillStyle = "rgba(255, 255, 255, 0.09)";
  ctx.beginPath();
  ctx.moveTo(edgeX - 70 * u, topY + 20 * u);
  ctx.lineTo(edgeX + 6 * u, topY + 36 * u);
  ctx.lineTo(edgeX - 16 * u, topY + 95 * u);
  ctx.lineTo(edgeX - 90 * u, topY + 120 * u);
  ctx.fill();
  ctx.restore();

  ctx.lineJoin = "round";
  ctx.lineWidth = 4 * u;
  ctx.strokeStyle = "#24160d";
  ctx.stroke(rock);

  drawGrass(ctx, u, left, edgeX, topY, true);
}

function drawWarningSign(
  ctx: CanvasRenderingContext2D,
  u: number,
  x: number,
  groundY: number,
) {
  ctx.lineJoin = "round";
  ctx.strokeStyle = INK;
  ctx.lineWidth = 3 * u;
  ctx.fillStyle = "#8a5a36";
  ctx.beginPath();
  ctx.rect(x - 3.5 * u, groundY - 62 * u, 7 * u, 66 * u);
  ctx.fill();
  ctx.stroke();

  const cy = groundY - 80 * u;
  const r = 26 * u;
  ctx.fillStyle = "#ffd23f";
  ctx.beginPath();
  ctx.moveTo(x, cy - r);
  ctx.lineTo(x + r, cy);
  ctx.lineTo(x, cy + r);
  ctx.lineTo(x - r, cy);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = INK;
  ctx.font = `900 ${30 * u}px "Arial Black", Impact, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("!", x, cy + 2 * u);
}

/** Runs off a cliff, hangs in the air for a moment of regret, then falls. */
export const cliff: Scene = (ctx, size, o) => {
  // Longer run on wider screens, within limits, so the pace feels the same
  const runSeconds = Math.min(2.6, Math.max(1.4, size.width / 700));
  const jumpAt = RUN_START + runSeconds;
  const hangAt = jumpAt + JUMP_SECONDS;
  const fallAt = hangAt + HANG_SECONDS;
  let screamed = false;
  let impactAt: number | null = null;
  let impactX = 0;

  return (t) => {
    const { width, height } = size;
    const u = unit(size, o.scale);
    const edgeX = width * 0.42;
    const topY = height * 0.62;
    const groundY = topY - 6 * u;
    const apexX = edgeX + 150 * u;
    const apexY = groundY - 150 * u;

    if (impactAt !== null) shake(ctx, u, t - impactAt);

    ctx.save();
    ctx.translate(0, (1 - easeOut(clamp01(t / 0.5))) * 80 * u);
    drawWarningSign(ctx, u, edgeX - 78 * u, groundY);
    drawCliff(ctx, height, u, edgeX, topY);
    ctx.restore();

    // Pebbles knocked off the edge by the jump
    const sinceJump = t - jumpAt;
    if (sinceJump > 0 && sinceJump < 1.5) {
      ctx.fillStyle = "#6b4630";
      for (let i = 0; i < 5; i++) {
        // Each one leaves a little later and a little further out
        const age = Math.max(0, sinceJump - i * 0.07);
        ctx.beginPath();
        ctx.arc(
          edgeX + (6 + ((i * 7) % 5) * 5) * u * (0.4 + age),
          topY + (8 + i * 5) * u + 0.5 * 900 * u * age ** 2,
          (2.5 + (i % 3) * 1.5) * u,
          0,
          Math.PI * 2,
        );
        ctx.fill();
      }
    }

    if (impactAt !== null) {
      const since = t - impactAt;
      drawDust(ctx, u, impactX, height, since / 1.1);
      drawImpactRays(ctx, u, impactX, height, since);
      drawGhost(ctx, u, impactX, height + 60 * u, o.name, since - GHOST_DELAY);
      return clamp01((impactAt + END_AFTER_IMPACT - t) / 0.6);
    }

    // Where the figure's hip is, and what it is doing
    let hipX: number;
    let hipY: number;
    let pose: Pose;
    let spin = 0;
    let labelDrop = 0;

    if (t < jumpAt) {
      const k = clamp01((t - RUN_START) / runSeconds);
      pose = runPose(t * 16);
      hipX = -60 * u + (edgeX - 6 * u + 60 * u) * k;
      hipY = groundY - footDrop(pose) * u;
    } else if (t < hangAt) {
      const k = (t - jumpAt) / JUMP_SECONDS;
      pose = leapPose;
      hipX = edgeX - 6 * u + (apexX - edgeX + 6 * u) * k;
      const startY = groundY - footDrop(pose) * u;
      hipY = startY + (apexY - startY) * easeOut(k);
    } else if (t < fallAt) {
      const hang = t - hangAt;
      // Holds the heroic pose for a beat before noticing the drop
      pose = hang < 0.3 ? leapPose : hangPose(hang);
      hipX = apexX;
      hipY = apexY + Math.sin(hang * 6) * 3 * u;
    } else {
      const fall = t - fallAt;
      pose = flailPose(fall);
      spin = Math.sin(fall * 9) * 0.25;
      hipX = apexX + Math.sin(fall * 7) * 6 * u;
      hipY = apexY + 0.5 * GRAVITY * u * fall ** 2;
      // The name hangs in the air a moment longer than its owner
      labelDrop = 0.5 * GRAVITY * u * Math.max(0, fall - 0.28) ** 2;

      if (!screamed) {
        screamed = true;
        const fallSeconds = Math.sqrt(
          (2 * (height + 200 * u - apexY)) / (GRAVITY * u),
        );
        o.sounds.scream((fallSeconds + 0.5) / o.speed);
      }
      if (hipY > height + 200 * u) {
        impactAt = t;
        impactX = hipX;
        o.sounds.thud();
      }

      // Speed lines above the falling figure
      ctx.save();
      ctx.strokeStyle = "#ffffff";
      ctx.lineCap = "round";
      ctx.lineWidth = 4 * u;
      ctx.globalAlpha = 0.55;
      for (let i = -2; i <= 2; i++) {
        const x = hipX + i * 22 * u;
        const top = hipY - (150 + ((i * i * 23) % 50)) * u;
        ctx.beginPath();
        ctx.moveTo(x, top - 70 * u);
        ctx.lineTo(x, top);
        ctx.stroke();
      }
      ctx.restore();
    }

    const headTop = drawFigure(ctx, u, hipX, hipY, pose, o.color, spin);

    const hang = t - hangAt;
    if (hang > 0.3 && t < fallAt) {
      // Pops in when the figure realises there is no ground
      const pop = easeOut(clamp01((hang - 0.3) / 0.15));
      drawLabel(
        ctx,
        "!",
        hipX + 62 * u,
        hipY - headTop + 46 * u,
        76 * u * pop,
        "#ffd23f",
      );
      // Sweat drop
      ctx.fillStyle = "#7fd4ff";
      ctx.beginPath();
      ctx.ellipse(
        hipX - 24 * u,
        hipY - headTop + (14 + ((hang * 40) % 22)) * u,
        3.5 * u,
        6 * u,
        0,
        0,
        Math.PI * 2,
      );
      ctx.fill();
    }

    const labelY =
      t < fallAt
        ? hipY - headTop - 16 * u
        : apexY - headTop - 16 * u + labelDrop;
    drawLabel(ctx, o.name, hipX, labelY, 30 * u);
    return 1;
  };
};
