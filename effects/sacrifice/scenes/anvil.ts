import {
  GHOST_SECONDS,
  INK,
  clamp01,
  drawDust,
  drawFigure,
  drawGhost,
  drawGround,
  drawImpactRays,
  drawLabel,
  easeIn,
  easeOut,
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
const WAVE_SECONDS = 1.4;
const NOTICE_SECONDS = 0.65;
const DROP_SECONDS = 0.3;
const GHOST_DELAY = 0.8;
const END_AFTER_IMPACT = GHOST_DELAY + GHOST_SECONDS + 0.2;

const ANVIL_HEIGHT = 112;

/** Classic cartoon anvil, with its base centred on (x, y). */
function drawAnvil(ctx: CanvasRenderingContext2D, u: number, x: number, y: number) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(u, u);
  const shape = new Path2D();
  shape.moveTo(-58, 0);
  shape.lineTo(58, 0);
  shape.lineTo(58, -20);
  shape.quadraticCurveTo(30, -24, 28, -50);
  shape.quadraticCurveTo(36, -68, 84, -70);
  shape.lineTo(84, -ANVIL_HEIGHT);
  shape.lineTo(-70, -ANVIL_HEIGHT);
  shape.lineTo(-132, -100);
  shape.quadraticCurveTo(-84, -74, -28, -64);
  shape.lineTo(-28, -50);
  shape.quadraticCurveTo(-30, -24, -58, -20);
  shape.closePath();

  const steel = ctx.createLinearGradient(0, -ANVIL_HEIGHT, 0, 0);
  steel.addColorStop(0, "#7b8592");
  steel.addColorStop(1, "#23272f");
  ctx.fillStyle = steel;
  ctx.fill(shape);
  ctx.lineJoin = "round";
  ctx.strokeStyle = INK;
  ctx.lineWidth = 4;
  ctx.stroke(shape);
  ctx.strokeStyle = "rgba(255, 255, 255, 0.35)";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(-64, -ANVIL_HEIGHT + 8);
  ctx.lineTo(76, -ANVIL_HEIGHT + 8);
  ctx.stroke();

  ctx.fillStyle = "#ffffff";
  ctx.font = '900 22px "Arial Black", Impact, sans-serif';
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("1 TON", 8, -88);
  ctx.restore();
}

/** Stops to wave at the camera, under a rapidly growing shadow. */
export const anvil: Scene = (ctx, size, o) => {
  const walkSeconds = Math.min(2.4, Math.max(1.4, size.width / 700));
  const waveAt = WALK_START + walkSeconds;
  const shadowAt = waveAt + 0.4;
  const noticeAt = waveAt + WAVE_SECONDS;
  const impactAt = noticeAt + NOTICE_SECONDS;
  let whistled = false;
  let screamed = false;
  let thudded = false;

  return (t) => {
    const { width, height } = size;
    const u = unit(size, o.scale);
    const groundTop = height * 0.8;
    const groundY = groundTop - 6 * u;
    const x = width * 0.5;
    const since = t - impactAt;

    if (since >= 0) shake(ctx, u, since, 18);
    drawGround(ctx, size, u, groundTop);

    // Shadow of whatever is coming
    if (t >= shadowAt) {
      const k = clamp01((t - shadowAt) / (impactAt - shadowAt));
      ctx.fillStyle = `rgba(0, 0, 0, ${0.15 + 0.3 * k})`;
      ctx.beginPath();
      ctx.ellipse(x, groundTop + 6 * u, lerp(18, 105, k) * u, lerp(4, 13, k) * u, 0, 0, Math.PI * 2);
      ctx.fill();
      if (!whistled) {
        whistled = true;
        o.sounds.whistle((impactAt - shadowAt) / o.speed);
      }
    }

    if (since < 0) {
      let pose: Pose;
      let hipX = x;
      if (t < waveAt) {
        const k = clamp01((t - WALK_START) / walkSeconds);
        pose = walkPose(t * 9);
        hipX = lerp(-60 * u, x, k);
      } else if (t < noticeAt) {
        pose = {
          ...standPose,
          arm: [0.25, -2.5 + Math.sin(t * 11) * 0.35],
          elbow: [0.15, -0.5],
        };
      } else {
        pose = hangPose(0);
        if (!screamed) {
          screamed = true;
          o.sounds.scream(NOTICE_SECONDS / o.speed);
        }
      }
      const hipY = groundY - footDrop(pose) * u;
      const headTop = drawFigure(ctx, u, hipX, hipY, pose, o.color);
      drawLabel(ctx, o.name, hipX, hipY - headTop - 16 * u, 30 * u);
      if (t >= noticeAt) {
        const pop = easeOut(clamp01((t - noticeAt) / 0.12));
        drawLabel(ctx, "!", hipX + 62 * u, hipY - headTop + 46 * u, 76 * u * pop, "#ffd23f");
      }

      const drop = (t - (impactAt - DROP_SECONDS)) / DROP_SECONDS;
      if (drop > 0) {
        drawAnvil(ctx, u, x, lerp(-60 * u, groundY + 6 * u, easeIn(drop)));
      }
      return 1;
    }

    if (!thudded) {
      thudded = true;
      o.sounds.thud();
    }

    // Arms and legs sticking out from under the anvil, still twitching
    const twitch = Math.sin(t * 30) * Math.max(0, 1 - since / 1.2) * 5 * u;
    ctx.lineCap = "round";
    for (const [style, w] of [
      [INK, 11],
      [o.color, 6],
    ] as const) {
      ctx.strokeStyle = style;
      ctx.lineWidth = w * u;
      for (const [from, to, rise] of [
        [-50, -100, 10],
        [-45, -92, -2],
        [50, 100, 10],
        [45, 92, -2],
      ]) {
        ctx.beginPath();
        ctx.moveTo(x + from * u, groundY + 2 * u);
        ctx.lineTo(x + to * u, groundY - rise * u + twitch * Math.sign(rise));
        ctx.stroke();
      }
    }

    // The anvil lands with a small bounce; the name is thrown up and lands on top
    const bounce = Math.abs(Math.sin(since * 18)) * 16 * u * Math.max(0, 1 - since / 0.35);
    const anvilY = groundY + 6 * u - bounce;
    drawAnvil(ctx, u, x, anvilY);
    const toss = Math.sin(Math.PI * clamp01(since / 0.55)) * 70 * u;
    drawLabel(
      ctx,
      o.name,
      x,
      anvilY - (ANVIL_HEIGHT + 10) * u - toss,
      30 * u,
      "#ffffff",
      since < 0.55 ? Math.sin(since * 12) * 0.3 : 0.06,
    );

    drawDust(ctx, u, x - 70 * u, groundTop, since / 0.9, 0.6);
    drawDust(ctx, u, x + 70 * u, groundTop, since / 0.9, 0.6);
    drawImpactRays(ctx, u, x, groundY - 40 * u, since);
    drawGhost(ctx, u, x, groundY - 70 * u, o.name, since - GHOST_DELAY);
    return clamp01((impactAt + END_AFTER_IMPACT - t) / 0.6);
  };
};
