"use client";

import { useEffect, useState, type CSSProperties } from "react";
import { createSoundPlayer } from "../sound";
import type { EffectProps } from "../types";
import styles from "./Message.module.css";

interface MessageParams {
  text: string;
  subtitle: string;
  icon: string;
  banner: string;
  bg: string;
  gradient: boolean;
  bg2: string;
  opacity: number;
  accent: string;
  border: number;
  radius: number;
  shadow: boolean;
  font: keyof typeof FONTS;
  size: number;
  color: string;
  bold: boolean;
  uppercase: boolean;
  outline: boolean;
  spacing: number;
  position: "top" | "center" | "bottom";
  align: "left" | "center" | "right";
  width: "fit" | "wide" | "full";
  margin: number;
  tilt: number;
  enter: string;
  exit: string;
  moveSeconds: number;
  loop: string;
  letters: string;
  speed: number;
  sound: string;
  volume: number;
  duration: number;
}

const FONTS = {
  impact: 'Impact, "Arial Black", Haettenschweiler, sans-serif',
  sans: 'system-ui, "Segoe UI", Roboto, Arial, sans-serif',
  rounded: '"Arial Rounded MT Bold", "Varela Round", "Segoe UI", sans-serif',
  serif: 'Georgia, "Times New Roman", serif',
  mono: '"Cascadia Code", Consolas, "Courier New", monospace',
  comic: '"Comic Sans MS", "Segoe Print", cursive',
  script: '"Segoe Script", "Brush Script MT", cursive',
};

const FLEX = { left: "flex-start", center: "center", right: "flex-end" };
const VERTICAL = { top: "flex-start", center: "center", bottom: "flex-end" };

function rgba(hex: string, alpha: number): string {
  const [r, g, b] = [1, 3, 5].map((at) => parseInt(hex.slice(at, at + 2), 16));
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/** Wraps each letter in a span carrying its index, keeping words unbreakable. */
function Letters({ text }: { text: string }) {
  const segmenter = new Intl.Segmenter(undefined, { granularity: "grapheme" });
  let index = 0;
  return text.split(/(\s+)/).map((part, w) =>
    part.trim() === "" ? (
      part
    ) : (
      <span key={w} className={styles.word}>
        {Array.from(segmenter.segment(part), (s) => (
          <span
            key={index}
            className={styles.letter}
            style={{ "--i": index++ } as CSSProperties}
          >
            {s.segment}
          </span>
        ))}
      </span>
    ),
  );
}

function Banner({ p }: { p: MessageParams }) {
  const [leaving, setLeaving] = useState(false);
  const [gone, setGone] = useState(false);

  useEffect(() => {
    const player = createSoundPlayer();
    player.play(p.sound, p.volume);
    const timers: number[] = [];
    if (p.duration > 0) {
      timers.push(
        window.setTimeout(() => setLeaving(true), p.duration * 1000),
        window.setTimeout(
          () => setGone(true),
          (p.duration + p.moveSeconds) * 1000,
        ),
      );
    }
    return () => {
      timers.forEach((t) => window.clearTimeout(t));
      player.dispose();
    };
  }, [p]);

  if (gone) return null;

  const exit = p.exit === "same" ? p.enter : p.exit;
  const move = leaving ? styles[`out-${exit}`] : styles[`in-${p.enter}`];
  const fill = p.gradient
    ? `linear-gradient(90deg, ${rgba(p.bg, p.opacity)}, ${rgba(p.bg2, p.opacity)})`
    : rgba(p.bg, p.opacity);

  const vars = {
    "--margin": p.width === "full" ? `${p.margin}px 0` : `${p.margin}px`,
    "--move": `${p.moveSeconds}s`,
    "--tilt": `${p.tilt}deg`,
    "--fill": fill,
    // Neon and glass banners are see-through versions of the banner colour
    "--fill-soft": rgba(p.bg, p.opacity * 0.3),
    "--tail": rgba(p.bg, p.opacity),
    "--accent": p.accent,
    "--border": `${p.border}px`,
    "--radius": `${p.radius}px`,
    "--text": p.color,
    "--size": `${p.size}px`,
    "--spacing": `${p.spacing}px`,
    "--speed": p.speed,
    // Longer messages take longer to cross the screen
    "--scroll": `${6 + p.text.length * 0.25}s`,
  } as CSSProperties;

  const text = p.uppercase ? p.text.toUpperCase() : p.text;
  const subtitle = p.uppercase ? p.subtitle.toUpperCase() : p.subtitle;

  return (
    <div
      className={styles.stage}
      style={{
        ...vars,
        alignItems: VERTICAL[p.position],
        justifyContent: FLEX[p.align],
      }}
    >
      <div
        className={`${styles.mover} ${move ?? ""} ${p.shadow ? styles.shadow : ""}`}
        style={{ width: p.width === "fit" ? undefined : p.width === "wide" ? "70%" : "100%" }}
      >
        <div className={styles.tilt}>
          <div
            className={[
              styles.banner,
              styles[`banner-${p.banner}`],
              styles[`loop-${p.loop}`],
              styles[`letters-${p.letters}`],
              p.outline ? styles.outlined : "",
            ].join(" ")}
            style={{
              fontFamily: FONTS[p.font],
              fontWeight: p.bold ? 700 : 400,
              textAlign: p.align,
            }}
          >
            {p.loop === "shine" && p.banner !== "none" && (
              <span className={styles.shine} />
            )}
            {p.icon && <span className={styles.icon}>{p.icon}</span>}
            <div className={styles.words}>
              <div className={styles.title}>
                <span className={styles.line}>
                  <Letters text={text} />
                </span>
              </div>
              {subtitle && <div className={styles.subtitle}>{subtitle}</div>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Message({ params }: EffectProps) {
  // Remounting on every change replays the arrival with the new settings
  return (
    <Banner
      key={JSON.stringify(params)}
      p={params as unknown as MessageParams}
    />
  );
}
