import {
  INK,
  clamp01,
  drawDust,
  drawFigure,
  drawGround,
  drawImpactRays,
  drawLabel,
  flailPose,
  footDrop,
  leapPose,
  lerp,
  runPose,
  shake,
  unit,
  type Scene,
} from "../shared";

const RUN_START = 0.3;
const HOP_SECONDS = 0.5;
const FUSE_SECONDS = 1.3;
const BARREL = 125;
// Up and to the right
const AIM = -Math.PI / 4;

function drawCannon(
  ctx: CanvasRenderingContext2D,
  u: number,
  x: number,
  groundY: number,
  recoil: number,
) {
  ctx.lineJoin = "round";
  ctx.strokeStyle = INK;
  ctx.lineWidth = 4 * u;

  ctx.save();
  ctx.translate(x, groundY - 38 * u);
  ctx.rotate(AIM);
  ctx.translate(-recoil, 0);
  const steel = ctx.createLinearGradient(0, -30 * u, 0, 30 * u);
  steel.addColorStop(0, "#7b8592");
  steel.addColorStop(1, "#23272f");
  ctx.fillStyle = steel;
  ctx.beginPath();
  ctx.moveTo(-40 * u, -28 * u);
  ctx.lineTo(BARREL * u, -24 * u);
  ctx.lineTo(BARREL * u, 24 * u);
  ctx.lineTo(-40 * u, 28 * u);
  ctx.arc(-40 * u, 0, 28 * u, Math.PI / 2, -Math.PI / 2);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  // Muzzle ring
  ctx.beginPath();
  ctx.rect((BARREL - 16) * u, -31 * u, 18 * u, 62 * u);
  ctx.fill();
  ctx.stroke();
  ctx.restore();

  // Wheel
  const wheelY = groundY - 32 * u;
  ctx.fillStyle = "#8a5a36";
  ctx.beginPath();
  ctx.arc(x, wheelY, 34 * u, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.lineWidth = 3 * u;
  for (let i = 0; i < 4; i++) {
    const angle = (i * Math.PI) / 4;
    ctx.beginPath();
    ctx.moveTo(x + Math.cos(angle) * 32 * u, wheelY + Math.sin(angle) * 32 * u);
    ctx.lineTo(x - Math.cos(angle) * 32 * u, wheelY - Math.sin(angle) * 32 * u);
    ctx.stroke();
  }
  ctx.fillStyle = INK;
  ctx.beginPath();
  ctx.arc(x, wheelY, 7 * u, 0, Math.PI * 2);
  ctx.fill();
}

/** Climbs into a cannon and is fired clean out of the stream. */
export const cannon: Scene = (ctx, size, o) => {
  const runSeconds = Math.min(1.6, Math.max(0.8, size.width / 1100));
  const hopAt = RUN_START + runSeconds;
  const loadedAt = hopAt + HOP_SECONDS;
  const boomAt = loadedAt + FUSE_SECONDS;
  const twinkleAt = boomAt + 0.9;
  const endAt = boomAt + 2.6;
  let fired = false;

  return (t) => {
    const { width, height } = size;
    const u = unit(size, o.scale);
    const groundTop = height * 0.8;
    const groundY = groundTop - 6 * u;
    const cx = width * 0.3;
    const dirX = Math.cos(AIM);
    const dirY = Math.sin(AIM);
    const muzzleX = cx + dirX * BARREL * u;
    const muzzleY = groundY - 38 * u + dirY * BARREL * u;
    const since = t - boomAt;

    if (since >= 0) shake(ctx, u, since, 16);
    drawGround(ctx, size, u, groundTop);

    // Running up and hopping in happen behind the barrel
    if (t < loadedAt) {
      let hipX: number;
      let hipY: number;
      let spin = 0;
      const startX = cx - 115 * u;
      let headTop: number;
      if (t < hopAt) {
        const pose = runPose(t * 16);
        hipX = lerp(-60 * u, startX, clamp01((t - RUN_START) / runSeconds));
        hipY = groundY - footDrop(pose) * u;
        headTop = drawFigure(ctx, u, hipX, hipY, pose, o.color);
      } else {
        const k = (t - hopAt) / HOP_SECONDS;
        hipX = lerp(startX, muzzleX, k);
        hipY = lerp(groundY - footDrop(leapPose) * u, muzzleY, k) - 4 * 130 * u * k * (1 - k);
        spin = k * 2.4;
        headTop = drawFigure(ctx, u, hipX, hipY, leapPose, o.color, spin);
      }
      drawLabel(ctx, o.name, hipX, hipY - headTop - 16 * u, 30 * u);
    }

    const recoil = since >= 0 ? 22 * u * Math.max(0, 1 - since / 0.3) : 0;
    drawCannon(ctx, u, cx, groundY, recoil);

    if (t >= loadedAt && since < 0) {
      // Fuse burning down towards the breech, with the name waiting above
      const k = (t - loadedAt) / FUSE_SECONDS;
      const breechX = cx - dirX * 62 * u;
      const breechY = groundY - 38 * u - dirY * 62 * u;
      const sparkX = lerp(breechX - 34 * u, breechX, k);
      const sparkY = lerp(breechY - 44 * u, breechY, k);
      ctx.strokeStyle = "#d9c49a";
      ctx.lineCap = "round";
      ctx.lineWidth = 4 * u;
      ctx.beginPath();
      ctx.moveTo(sparkX, sparkY);
      ctx.lineTo(breechX, breechY);
      ctx.stroke();
      ctx.fillStyle = Math.floor(t * 30) % 2 ? "#ffd23f" : "#ff8a1f";
      ctx.beginPath();
      ctx.arc(sparkX, sparkY, (6 + Math.random() * 4) * u, 0, Math.PI * 2);
      ctx.fill();
      drawLabel(ctx, o.name, muzzleX, muzzleY - 50 * u + Math.sin(t * 8) * 3 * u, 30 * u);
    }

    if (since >= 0) {
      if (!fired) {
        fired = true;
        o.sounds.thud();
        o.sounds.scream(1.2 / o.speed);
        o.sounds.whistle(0.9 / o.speed);
      }
      const distance = since * 2600 * u;
      const x = muzzleX + dirX * distance;
      const y = muzzleY + dirY * distance;
      if (y > -200 * u && x < width + 200 * u) {
        const headTop = drawFigure(ctx, u, x, y, flailPose(since), o.color, since * 14);
        drawLabel(ctx, o.name, x - dirX * 60 * u, y - dirY * 60 * u - headTop, 30 * u);
      }
      drawDust(ctx, u, muzzleX + dirX * 30 * u, muzzleY + dirY * 30 * u + 40 * u, since / 1.1, 0.8);
      drawImpactRays(ctx, u, muzzleX, muzzleY, since);

      // A distant twinkle where the figure left the screen
      const reach = Math.min(
        (muzzleY - 50 * u) / -dirY,
        (width - 50 * u - muzzleX) / dirX,
      );
      const twinkle = Math.sin(Math.PI * clamp01((t - twinkleAt) / 0.7));
      if (twinkle > 0) {
        const r = 46 * u * twinkle;
        ctx.save();
        ctx.translate(muzzleX + dirX * reach, muzzleY + dirY * reach);
        ctx.rotate(t * 2);
        ctx.fillStyle = "#fff7c2";
        ctx.strokeStyle = INK;
        ctx.lineWidth = 3 * u;
        ctx.beginPath();
        for (let i = 0; i < 8; i++) {
          const radius = i % 2 ? r * 0.22 : r;
          const angle = (i * Math.PI) / 4;
          ctx.lineTo(Math.cos(angle) * radius, Math.sin(angle) * radius);
        }
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();
      }
    }
    return clamp01((endAt - t) / 0.6);
  };
};
