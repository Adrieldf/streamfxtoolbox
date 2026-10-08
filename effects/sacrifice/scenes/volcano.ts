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
  runPose,
  shake,
  unit,
  type Pose,
  type Scene,
} from "../shared";

const RUN_START = 0.3;
const CLIMB_SECONDS = 1.3;
const POSE_SECONDS = 0.8;
const DIVE_SECONDS = 0.85;
const GHOST_DELAY = 0.7;
const END_AFTER_SPLASH = GHOST_DELAY + GHOST_SECONDS + 0.2;

const triumphPose: Pose = {
  lean: -0.08,
  thigh: [0.2, -0.2],
  knee: [0.05, 0.05],
  arm: [2.5, -2.5],
  elbow: [0.2, -0.2],
  face: "run",
};

const divePose: Pose = {
  lean: 0,
  thigh: [0.15, -0.1],
  knee: [0.1, 0.1],
  arm: [3.0, -3.0],
  elbow: [0, 0],
  face: "scream",
};

/** Climbs a volcano, strikes a pose on the rim and swan-dives into the lava. */
export const volcano: Scene = (ctx, size, o) => {
  const runSeconds = Math.min(2, Math.max(1, size.width / 900));
  const climbAt = RUN_START + runSeconds;
  const poseAt = climbAt + CLIMB_SECONDS;
  const diveAt = poseAt + POSE_SECONDS;
  const splashAt = diveAt + DIVE_SECONDS;
  let screamed = false;
  let splashed = false;

  return (t) => {
    const { width, height } = size;
    const u = unit(size, o.scale);
    const groundTop = height * 0.8;
    const groundY = groundTop - 6 * u;
    const cx = width * 0.66;
    const rimY = groundY - 250 * u;
    const crater = 62 * u;
    const base = 260 * u;

    // The left slope is a curve; the figure climbs along it
    const slope = (k: number) => {
      const a = [cx - base, groundY];
      const c = [cx - base * 0.42, groundY - 85 * u];
      const b = [cx - crater, rimY];
      return [0, 1].map(
        (i) => (1 - k) ** 2 * a[i] + 2 * k * (1 - k) * c[i] + k ** 2 * b[i],
      );
    };

    const sinceSplash = t - splashAt;
    if (sinceSplash >= 0) shake(ctx, u, sinceSplash, 8);

    // Glow and the lava surface, behind the cone
    const pulse = 0.8 + Math.sin(t * 5) * 0.2 + (sinceSplash > 0 ? Math.max(0, 1 - sinceSplash) : 0);
    const glow = ctx.createRadialGradient(cx, rimY, 0, cx, rimY, 170 * u);
    glow.addColorStop(0, `rgba(255, 150, 40, ${0.45 * pulse})`);
    glow.addColorStop(1, "rgba(255, 150, 40, 0)");
    ctx.fillStyle = glow;
    ctx.fillRect(cx - 180 * u, rimY - 180 * u, 360 * u, 360 * u);
    const lava = ctx.createLinearGradient(0, rimY - 14 * u, 0, rimY + 14 * u);
    lava.addColorStop(0, "#ffd23f");
    lava.addColorStop(1, "#ff6a1f");
    ctx.fillStyle = lava;
    ctx.strokeStyle = INK;
    ctx.lineWidth = 4 * u;
    ctx.beginPath();
    ctx.ellipse(cx, rimY, crater, 15 * u, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // The diver and the falling name go behind the front of the cone
    const diving = t >= diveAt;
    let headTop = 0;
    let hipX = 0;
    let hipY = 0;
    if (diving && t < splashAt) {
      const k = (t - diveAt) / DIVE_SECONDS;
      hipX = lerp(cx - crater, cx, k);
      hipY = lerp(rimY - 50 * u, rimY + 30 * u, k) - 4 * 115 * u * k * (1 - k);
      headTop = drawFigure(ctx, u, hipX, hipY, divePose, o.color, k * 3);
      if (!screamed) {
        screamed = true;
        o.sounds.scream(1 / o.speed);
      }
    }
    if (diving) {
      // The name hovers over the crater a moment, then drops in after its owner
      const dropping = Math.max(0, t - splashAt - 0.3);
      const hover = lerp(rimY - 160 * u, rimY - 120 * u, clamp01((t - diveAt) / DIVE_SECONDS));
      drawLabel(
        ctx,
        o.name,
        t < splashAt ? hipX : cx,
        hover + 0.5 * 1400 * u * dropping ** 2,
        30 * u,
      );
    }

    // Cone
    const cone = new Path2D();
    cone.moveTo(cx - base, groundTop + 10 * u);
    cone.quadraticCurveTo(cx - base * 0.42, groundY - 85 * u, cx - crater, rimY);
    cone.quadraticCurveTo(cx, rimY + 30 * u, cx + crater, rimY);
    cone.quadraticCurveTo(cx + base * 0.42, groundY - 85 * u, cx + base, groundTop + 10 * u);
    cone.closePath();
    const rock = ctx.createLinearGradient(0, rimY, 0, groundTop);
    rock.addColorStop(0, "#75605f");
    rock.addColorStop(1, "#2e2527");
    ctx.fillStyle = rock;
    ctx.fill(cone);

    ctx.save();
    ctx.clip(cone);
    // Ridges, then lava running down the front
    ctx.strokeStyle = "rgba(0, 0, 0, 0.2)";
    ctx.lineWidth = 5 * u;
    for (const side of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(cx + side * 30 * u, rimY + 40 * u);
      ctx.quadraticCurveTo(cx + side * 70 * u, rimY + 140 * u, cx + side * 150 * u, groundTop);
      ctx.stroke();
    }
    ctx.lineCap = "round";
    for (const [dx, length, wobble] of [
      [-28, 120, 14],
      [8, 175, -16],
      [36, 90, 10],
    ]) {
      const x = cx + dx * u;
      const top = rimY + 12 * u;
      for (const [style, w] of [
        ["#ff6a1f", 13],
        ["#ffd23f", 5],
      ] as const) {
        ctx.strokeStyle = style;
        ctx.lineWidth = w * u;
        ctx.beginPath();
        ctx.moveTo(x, top);
        ctx.bezierCurveTo(
          x + wobble * u, top + length * 0.35 * u,
          x - wobble * u, top + length * 0.7 * u,
          x + wobble * 0.5 * u, top + length * u,
        );
        ctx.stroke();
      }
    }
    ctx.restore();
    ctx.lineJoin = "round";
    ctx.strokeStyle = INK;
    ctx.lineWidth = 4 * u;
    ctx.stroke(cone);

    drawGround(ctx, size, u, groundTop);

    // Smoke drifting from the crater
    ctx.save();
    ctx.fillStyle = "#d4cdc4";
    for (let i = 0; i < 4; i++) {
      const k = (t * 0.35 + i / 4) % 1;
      ctx.globalAlpha = (1 - k) * 0.35;
      ctx.beginPath();
      ctx.arc(
        cx + Math.sin(i * 2 + t) * 28 * u * k,
        rimY - 25 * u - k * 160 * u,
        (14 + 24 * k) * u,
        0,
        Math.PI * 2,
      );
      ctx.fill();
    }
    ctx.restore();

    // Running, climbing and posing happen in front of the volcano
    if (!diving) {
      let pose: Pose;
      if (t < climbAt) {
        const k = clamp01((t - RUN_START) / runSeconds);
        pose = runPose(t * 16);
        hipX = lerp(-60 * u, cx - base, k);
        hipY = groundY - footDrop(pose) * u;
      } else if (t < poseAt) {
        const k = easeOut((t - climbAt) / CLIMB_SECONDS);
        pose = runPose(t * 13);
        const [x, y] = slope(k);
        hipX = x;
        hipY = y - footDrop(pose) * u;
      } else {
        pose = triumphPose;
        hipX = cx - crater - 4 * u;
        hipY = rimY - footDrop(pose) * u;
        const pop = easeOut(clamp01((t - poseAt - 0.1) / 0.15));
        drawLabel(ctx, "YOLO!", hipX - 95 * u, hipY - 70 * u, 34 * u * pop, "#ffd23f", -0.15);
      }
      headTop = drawFigure(ctx, u, hipX, hipY, pose, o.color);
      drawLabel(ctx, o.name, hipX, hipY - headTop - 16 * u, 30 * u);
    }

    if (sinceSplash >= 0) {
      if (!splashed) {
        splashed = true;
        o.sounds.sizzle();
        o.sounds.thud();
      }
      // Lava thrown up by the dive
      if (sinceSplash < 1.5) {
        for (let i = 0; i < 9; i++) {
          const vx = (i - 4) * 48 * u;
          const vy = -(430 + ((i * 53) % 170)) * u;
          ctx.fillStyle = i % 2 ? "#ffd23f" : "#ff6a1f";
          ctx.strokeStyle = INK;
          ctx.lineWidth = 2.5 * u;
          ctx.beginPath();
          ctx.arc(
            cx + vx * sinceSplash,
            rimY + vy * sinceSplash + 0.5 * 900 * u * sinceSplash ** 2,
            (7 + (i % 3) * 3) * u,
            0,
            Math.PI * 2,
          );
          ctx.fill();
          ctx.stroke();
        }
      }
      drawGhost(ctx, u, cx, rimY + 40 * u, o.name, sinceSplash - GHOST_DELAY);
      return clamp01((splashAt + END_AFTER_SPLASH - t) / 0.6);
    }
    return 1;
  };
};
