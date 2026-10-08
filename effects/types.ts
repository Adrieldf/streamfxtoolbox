import type { ComponentType } from "react";

export type ParamValue = number | boolean | string;
export type ParamValues = Record<string, ParamValue>;

interface ParamBase {
  /** Query string key, e.g. `?intensity=30` */
  key: string;
  label: string;
  help?: string;
  /** Hide the control in the panel unless this returns true */
  showIf?: (values: ParamValues) => boolean;
}

export interface NumberParam extends ParamBase {
  type: "number";
  default: number;
  min: number;
  max: number;
  step?: number;
  unit?: string;
}

export interface BooleanParam extends ParamBase {
  type: "boolean";
  default: boolean;
}

export interface SelectParam extends ParamBase {
  type: "select";
  default: string;
  options: { value: string; label: string }[];
}

export interface ColorParam extends ParamBase {
  type: "color";
  /** `#rrggbb` — the `#` is dropped in the URL */
  default: string;
}

export interface TextParam extends ParamBase {
  type: "text";
  default: string;
}

export type ParamDef =
  | NumberParam
  | BooleanParam
  | SelectParam
  | ColorParam
  | TextParam;

export interface EffectDefinition {
  /** URL segment: `/overlay/<id>` */
  id: string;
  name: string;
  description: string;
  params: ParamDef[];
  /**
   * For the queue: how long the effect needs when these values make it fire
   * once and finish on its own. Return null when it would keep running.
   */
  oneShotSeconds?: (values: ParamValues) => number | null;
}

export interface EffectProps {
  params: ParamValues;
}

export type EffectComponent = ComponentType<EffectProps>;

export function getDefaults(effect: EffectDefinition): ParamValues {
  return Object.fromEntries(effect.params.map((p) => [p.key, p.default]));
}

function parseValue(def: ParamDef, raw: string | null): ParamValue {
  if (raw === null) return def.default;
  switch (def.type) {
    case "number": {
      const n = Number(raw);
      if (raw.trim() === "" || !Number.isFinite(n)) return def.default;
      return Math.min(def.max, Math.max(def.min, n));
    }
    case "boolean":
      if (raw === "1" || raw === "true") return true;
      if (raw === "0" || raw === "false") return false;
      return def.default;
    case "select":
      return def.options.some((o) => o.value === raw) ? raw : def.default;
    case "color":
      return /^#?[0-9a-f]{6}$/i.test(raw)
        ? `#${raw.replace("#", "")}`
        : def.default;
    case "text":
      return raw;
  }
}

/** Reads an effect's params from a query string, falling back to defaults. */
export function parseParams(
  effect: EffectDefinition,
  query: { get(key: string): string | null },
): ParamValues {
  return Object.fromEntries(
    effect.params.map((p) => [p.key, parseValue(p, query.get(p.key))]),
  );
}

/** Builds the query string for an effect, leaving out values still at default. */
export function buildQuery(
  effect: EffectDefinition,
  values: ParamValues,
): string {
  const query = new URLSearchParams();
  for (const p of effect.params) {
    const value = values[p.key];
    if (value === undefined || value === p.default) continue;
    if (p.type === "boolean") query.set(p.key, value ? "1" : "0");
    else if (p.type === "color") query.set(p.key, String(value).replace("#", ""));
    else query.set(p.key, String(value));
  }
  return query.toString();
}

export function overlayPath(effect: EffectDefinition, values: ParamValues) {
  const query = buildQuery(effect, values);
  return `/overlay/${effect.id}${query ? `?${query}` : ""}`;
}

export function queueAddPath(effect: EffectDefinition, values: ParamValues) {
  const query = buildQuery(effect, values);
  return `/add/${effect.id}${query ? `?${query}` : ""}`;
}

const QUEUE_DEFAULT_SECONDS = 10;
// Time for rockets, confetti and fades to finish after an effect stops
const QUEUE_TAIL_SECONDS = 3;

/**
 * Queued effects must end so the next one can play. An effect left at
 * "run forever" is given a default duration.
 */
export function planPlayback(
  effect: EffectDefinition,
  params: ParamValues,
): { params: ParamValues; seconds: number } {
  const oneShot = effect.oneShotSeconds?.(params);
  if (oneShot) return { params, seconds: oneShot };

  const duration =
    typeof params.duration === "number" && params.duration > 0
      ? params.duration
      : QUEUE_DEFAULT_SECONDS;
  return {
    params: { ...params, duration },
    seconds: duration + QUEUE_TAIL_SECONDS,
  };
}
