import {
  INK,
  clamp01,
  drawDust,
  drawFigure,
  drawGround,
  drawLabel,
  easeIn,
  easeOut,
  flailPose,
  footDrop,
  lerp,
  standPose,
  unit,
  walkPose,
  type Pose,
  type Scene,
} from "../shared";

const WALK_START = 0.3;
const ARRIVE_SECONDS = 1.3;
const LIFT_SECONDS = 2.1;
const ZIP_SECONDS = 0.45;

const LIGHTS = ["#ff5d73", "#ffd23f", "#6fe38a", "#7fd4ff"];

function drawSaucer(
  ctx: CanvasRenderingContext2D,
  u: number,
  x: number,
  y: number,
  tilt: number,
  t: number,
  beaming: boolean,
) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(tilt);
  ctx.lineJoin = "round";
  ctx.strokeStyle = INK;
  ctx.lineWidth = 4 * u;

  // Dome, with the pilot peeking out
  const glass = ctx.createLinearGradient(0, -58 * u, 0, 0);
  glass.addColorStop(0, "rgba(190, 240, 255, 0.9)");
  glass.addColorStop(1, "rgba(90, 190, 235, 0.75)");
  ctx.fillStyle = "#7ee08a";
  ctx.beginPath();
  ctx.arc(0, -22 * u, 17 * u, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = INK;
  for (const ex of [-7, 7]) {
    ctx.beginPath();
    ctx.ellipse(ex * u, -25 * u, 4 * u, 6 * u, ex * 0.04, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = glass;
  ctx.beginPath();
  ctx.ellipse(0, -8 * u, 54 * u, 50 * u, 0, Math.PI, Math.PI * 2);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.strokeStyle = "rgba(255, 255, 255, 0.8)";
  ctx.lineWidth = 3 * u;
  ctx.beginPath();
  ctx.arc(0, -8 * u, 40 * u, Math.PI * 1.15, Math.PI * 1.4);
  ctx.stroke();

  // Hull
  const hull = ctx.createLinearGradient(0, -28 * u, 0, 28 * u);
  hull.addColorStop(0, "#eef1f7");
  hull.addColorStop(1, "#6f7890");
  ctx.fillStyle = hull;
  ctx.strokeStyle = INK;
  ctx.lineWidth = 4 * u;
  ctx.beginPath();
  ctx.ellipse(0, 0, 112 * u, 28 * u, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = beaming ? "#b8ffd6" : "#474e63";
  ctx.beginPath();
  ctx.ellipse(0, 17 * u, 44 * u, 9 * u, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Chasing rim lights
  ctx.lineWidth = 2.5 * u;
  for (let i = 0; i < 7; i++) {
    const angle = Math.PI * (0.12 + (0.76 * i) / 6);
    ctx.fillStyle = LIGHTS[(i + Math.floor(t * 6)) % LIGHTS.length];
    ctx.beginPath();
    ctx.arc(Math.cos(angle) * 94 * u, Math.sin(angle) * 15 * u, 6 * u, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }
  ctx.restore();
}

/** Out for a stroll, then taken by a flying saucer. Only the name is left behind. */
export const ufo: Scene = (ctx, size, o) => {
  const walkSeconds = Math.min(2.4, Math.max(1.4, size.width / 700));
  const stopAt = WALK_START + walkSeconds;
  const arriveAt = stopAt - 0.4;
  const lookAt = arriveAt + 1;
  const beamAt = arriveAt + 1.7;
  const liftAt = beamAt + 0.25;
  const takenAt = liftAt + LIFT_SECONDS;
  const zipAt = takenAt + 0.75;
  const endAt = zipAt + ZIP_SECONDS + 1.6;
  let hummed = false;
  let screamed = false;
  let landedAt: number | null = null;

  return (t) => {
    const { width, height } = size;
    const u = unit(size, o.scale);
    const groundTop = height * 0.8;
    const groundY = groundTop - 6 * u;
    const standX = width * 0.5;
    const hoverY = height * 0.2;

    drawGround(ctx, size, u, groundTop);

    // Saucer position: swoops in, hovers, then shoots off
    let saucerX = standX;
    let saucerY = hoverY + Math.sin(t * 3) * 6 * u;
    let tilt = Math.sin(t * 2.2) * 0.04;
    if (t < arriveAt + ARRIVE_SECONDS) {
      const k = easeOut(clamp01((t - arriveAt) / ARRIVE_SECONDS));
      saucerX = lerp(width + 220 * u, standX, k);
      saucerY = lerp(-160 * u, saucerY, k);
      tilt = (1 - k) * -0.35;
    } else if (t >= zipAt) {
      const k = easeIn(clamp01((t - zipAt) / ZIP_SECONDS));
      saucerX = lerp(standX, width + 320 * u, k);
      saucerY = lerp(saucerY, -260 * u, k);
      tilt = 0.45 * Math.min(1, k * 4);
    } else if (t >= takenAt) {
      // Satisfied wobble
      tilt = Math.sin((t - takenAt) * 16) * 0.1;
    }
    if (t >= arriveAt && !hummed) {
      hummed = true;
      o.sounds.hum((zipAt + ZIP_SECONDS - arriveAt) / o.speed);
    }

    const beaming = t >= beamAt && t < takenAt + 0.15;
    if (beaming) {
      const flicker = 0.85 + Math.sin(t * 40) * 0.15;
      const beam = ctx.createLinearGradient(0, saucerY, 0, groundTop);
      beam.addColorStop(0, `rgba(150, 255, 205, ${0.6 * flicker})`);
      beam.addColorStop(1, `rgba(150, 255, 205, ${0.14 * flicker})`);
      ctx.fillStyle = beam;
      ctx.beginPath();
      ctx.moveTo(saucerX - 42 * u, saucerY + 18 * u);
      ctx.lineTo(saucerX + 42 * u, saucerY + 18 * u);
      ctx.lineTo(saucerX + 125 * u, groundTop + 6 * u);
      ctx.lineTo(saucerX - 125 * u, groundTop + 6 * u);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = `rgba(190, 255, 225, ${0.5 * flicker})`;
      ctx.beginPath();
      ctx.ellipse(saucerX, groundTop + 6 * u, 125 * u, 14 * u, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    if (t < takenAt) {
      let pose: Pose;
      let hipX = standX;
      let hipY: number;
      let spin = 0;
      if (t < stopAt) {
        const k = clamp01((t - WALK_START) / walkSeconds);
        pose = walkPose(t * 9);
        hipX = lerp(-60 * u, standX, k);
        hipY = groundY - footDrop(pose) * u;
      } else if (t < liftAt) {
        pose = t < lookAt ? standPose : { ...standPose, face: "shock" };
        hipY = groundY - footDrop(pose) * u;
      } else {
        const lift = t - liftAt;
        pose = flailPose(lift);
        spin = Math.sin(lift * 4) * 0.5;
        hipY = lerp(
          groundY - footDrop(standPose) * u,
          saucerY + 50 * u,
          easeIn(lift / LIFT_SECONDS),
        );
        if (!screamed) {
          screamed = true;
          o.sounds.scream(LIFT_SECONDS / o.speed);
        }
      }
      const headTop = drawFigure(ctx, u, hipX, hipY, pose, o.color, spin);
      drawLabel(ctx, o.name, hipX, hipY - headTop - 16 * u, 30 * u);
      if (t >= lookAt && t < liftAt) {
        const pop = easeOut(clamp01((t - lookAt) / 0.15));
        drawLabel(ctx, "?", hipX + 62 * u, hipY - headTop + 46 * u, 76 * u * pop, "#ffd23f");
      }
    } else {
      // The saucer keeps the figure and drops the name
      const since = t - takenAt;
      const restY = groundY - 4 * u;
      const y = saucerY + 90 * u + 0.5 * 1500 * u * since ** 2;
      if (y >= restY && landedAt === null) {
        landedAt = t;
        o.sounds.thud();
      }
      if (landedAt !== null) drawDust(ctx, u, standX, groundTop, (t - landedAt) / 0.8, 0.5);
      drawLabel(
        ctx,
        o.name,
        standX,
        Math.min(y, restY),
        30 * u,
        "#ffffff",
        landedAt === null ? since * 2 : -0.07,
      );
      if (since < 0.2) {
        ctx.fillStyle = `rgba(255, 255, 255, ${1 - since / 0.2})`;
        ctx.beginPath();
        ctx.ellipse(saucerX, saucerY + 30 * u, 70 * u, 26 * u, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    drawSaucer(ctx, u, saucerX, saucerY, tilt, t, beaming);
    return clamp01((endAt - t) / 0.6);
  };
};
