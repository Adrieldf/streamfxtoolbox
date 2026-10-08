"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { effects } from "@/effects/registry";
import {
  getDefaults,
  overlayPath,
  queueAddPath,
  type ParamDef,
  type ParamValue,
  type ParamValues,
} from "@/effects/types";
import { clearQueue, enqueue } from "@/lib/queue";

const BACKDROPS = [
  { id: "checker", label: "Transparent" },
  { id: "dark", label: "Dark" },
  { id: "light", label: "Light" },
] as const;

type Backdrop = (typeof BACKDROPS)[number]["id"];

// Set by the GitHub Pages build, where the site lives under /<repository name>
const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

const noopSubscribe = () => () => {};

function useOrigin() {
  return useSyncExternalStore(
    noopSubscribe,
    () => window.location.origin,
    () => "",
  );
}

function useDebounced<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value), delayMs);
    return () => window.clearTimeout(timer);
  }, [value, delayMs]);
  return debounced;
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  }

  return (
    <button type="button" className="primary" onClick={copy}>
      {copied ? "Copied" : "Copy"}
    </button>
  );
}

function describeValues(p: ParamDef): string {
  switch (p.type) {
    case "number":
      return `${p.min} – ${p.max}${p.unit ? ` ${p.unit}` : ""}`;
    case "boolean":
      return "1 or 0";
    case "select": {
      const values = p.options.map((o) => o.value);
      // Sound pickers list every file in public/sounds
      return values.length > 10
        ? `${values.slice(0, 4).join(", ")}, … (${values.length} options, see the control)`
        : values.join(", ");
    }
    case "color":
      return "hex without #, e.g. ff8800";
    case "text":
      return "text";
  }
}

function describeDefault(p: ParamDef): string {
  if (p.type === "boolean") return p.default ? "1" : "0";
  if (p.type === "color") return p.default.replace("#", "");
  return String(p.default);
}

function ParamControl({
  def,
  value,
  onChange,
}: {
  def: ParamDef;
  value: ParamValue;
  onChange: (value: ParamValue) => void;
}) {
  const id = `param-${def.key}`;
  let control;

  switch (def.type) {
    case "number":
      control = (
        <div className="control-number">
          <input
            id={id}
            type="range"
            min={def.min}
            max={def.max}
            step={def.step ?? 1}
            value={value as number}
            onChange={(e) => onChange(Number(e.target.value))}
          />
          <input
            type="number"
            aria-label={def.label}
            min={def.min}
            max={def.max}
            step={def.step ?? 1}
            value={value as number}
            onChange={(e) => {
              const n = e.target.valueAsNumber;
              if (Number.isFinite(n)) {
                onChange(Math.min(def.max, Math.max(def.min, n)));
              }
            }}
          />
          {def.unit && <span className="unit">{def.unit}</span>}
        </div>
      );
      break;
    case "boolean":
      control = (
        <input
          id={id}
          type="checkbox"
          checked={value as boolean}
          onChange={(e) => onChange(e.target.checked)}
        />
      );
      break;
    case "select":
      control = (
        <select
          id={id}
          value={value as string}
          onChange={(e) => onChange(e.target.value)}
        >
          {def.options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      );
      break;
    case "color":
      control = (
        <input
          id={id}
          type="color"
          value={value as string}
          onChange={(e) => onChange(e.target.value)}
        />
      );
      break;
    case "text":
      control = (
        <input
          id={id}
          type="text"
          value={value as string}
          onChange={(e) => onChange(e.target.value)}
        />
      );
      break;
  }

  return (
    <div className="control">
      <label htmlFor={id}>
        {def.label} <code>{def.key}</code>
      </label>
      {control}
      {def.help && <p className="help">{def.help}</p>}
    </div>
  );
}

export default function ControlPanel() {
  const [effectId, setEffectId] = useState(effects[0].id);
  const [valuesByEffect, setValuesByEffect] = useState<
    Record<string, ParamValues>
  >(() => Object.fromEntries(effects.map((e) => [e.id, getDefaults(e)])));
  const [backdrop, setBackdrop] = useState<Backdrop>("checker");
  const [replayKey, setReplayKey] = useState(0);
  const [queueStatus, setQueueStatus] = useState("");
  const origin = useOrigin();

  const effect = effects.find((e) => e.id === effectId) ?? effects[0];
  const values = valuesByEffect[effect.id];
  const path = BASE_PATH + overlayPath(effect, values);
  const previewPath = useDebounced(path, 250);
  const url = origin + path;
  const queueUrl = origin + BASE_PATH + queueAddPath(effect, values);
  const playerPath = `${BASE_PATH}/queue`;

  function setValue(key: string, value: ParamValue) {
    setValuesByEffect((prev) => ({
      ...prev,
      [effect.id]: { ...prev[effect.id], [key]: value },
    }));
  }

  function reset() {
    setValuesByEffect((prev) => ({ ...prev, [effect.id]: getDefaults(effect) }));
  }

  function addToQueue() {
    const position = enqueue(effect.id, values);
    setQueueStatus(
      position === null ? "The queue is full" : `Queued at position ${position}`,
    );
  }

  function emptyQueue() {
    setQueueStatus(`Cleared ${clearQueue()} queued`);
  }

  return (
    <div className="shell">
      <aside className="sidebar">
        <h1>StreamFX Toolbox</h1>
        <h2>Effects</h2>
        <ul>
          {effects.map((e) => (
            <li key={e.id}>
              <button
                type="button"
                className={e.id === effect.id ? "active" : ""}
                onClick={() => setEffectId(e.id)}
              >
                {e.name}
                <code>/overlay/{e.id}</code>
              </button>
            </li>
          ))}
        </ul>
      </aside>

      <main className="main">
        <header>
          <h2>{effect.name}</h2>
          <p>{effect.description}</p>
        </header>

        <section className="preview-section">
          <div className="toolbar">
            <div className="segmented" role="group" aria-label="Preview backdrop">
              {BACKDROPS.map((b) => (
                <button
                  key={b.id}
                  type="button"
                  className={b.id === backdrop ? "active" : ""}
                  onClick={() => setBackdrop(b.id)}
                >
                  {b.label}
                </button>
              ))}
            </div>
            <button type="button" onClick={() => setReplayKey((k) => k + 1)}>
              Replay
            </button>
          </div>
          <div className={`preview backdrop-${backdrop}`}>
            <iframe
              key={replayKey}
              src={previewPath}
              title={`${effect.name} preview`}
            />
          </div>
        </section>

        <section className="url-section">
          <h3>Overlay URL</h3>
          <div className="url-row">
            <input type="text" readOnly value={url} aria-label="Overlay URL" />
            <CopyButton text={url} />
            <a href={path} target="_blank" rel="noreferrer">
              Open
            </a>
          </div>
          <p className="help">
            In OBS or Streamlabs, add a Browser source, paste this URL and set
            the size to your canvas (for example 1920 × 1080). The page
            background is transparent.
          </p>
        </section>

        <section className="url-section">
          <h3>Queue</h3>
          <p className="help">
            Add one Browser source with the player URL. It stays empty until
            something is queued, then plays queued effects one after another.
            Opening an add URL queues this effect with the current settings.
            The queue is stored in the browser, so the add URL has to be opened
            in the same browser as the player: for OBS, inside OBS itself.
          </p>
          <label className="field-label" htmlFor="queue-player-url">
            Player URL (Browser source)
          </label>
          <div className="url-row">
            <input
              id="queue-player-url"
              type="text"
              readOnly
              value={origin + playerPath}
            />
            <CopyButton text={origin + playerPath} />
            <a href={playerPath} target="_blank" rel="noreferrer">
              Open
            </a>
          </div>
          <label className="field-label" htmlFor="queue-add-url">
            Add URL for {effect.name}
          </label>
          <div className="url-row">
            <input
              id="queue-add-url"
              type="text"
              readOnly
              value={queueUrl}
            />
            <CopyButton text={queueUrl} />
            <button type="button" onClick={addToQueue}>
              Add now
            </button>
          </div>
          <div className="queue-row">
            <button type="button" onClick={emptyQueue}>
              Clear queue
            </button>
            <span className="help" role="status">
              {queueStatus}
            </span>
          </div>
          <p className="help">
            An effect set to run forever plays for 10 seconds in the queue; set
            its duration to change that. Queued effects that are not played
            within 10 minutes are dropped.
          </p>
        </section>

        <section>
          <h3>URL parameters</h3>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Parameter</th>
                  <th>Values</th>
                  <th>Default</th>
                  <th>What it does</th>
                </tr>
              </thead>
              <tbody>
                {effect.params.map((p) => (
                  <tr key={p.key}>
                    <td>
                      <code>{p.key}</code>
                    </td>
                    <td>{describeValues(p)}</td>
                    <td>{describeDefault(p)}</td>
                    <td>
                      {p.label}
                      {p.help ? `. ${p.help}` : ""}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </main>

      <aside className="controls">
        <div className="controls-head">
          <h3>Controls</h3>
          <button type="button" onClick={reset}>
            Reset
          </button>
        </div>
        {effect.params
          .filter((p) => !p.showIf || p.showIf(values))
          .map((p) => (
            <ParamControl
              key={p.key}
              def={p}
              value={values[p.key]}
              onChange={(v) => setValue(p.key, v)}
            />
          ))}
      </aside>
    </div>
  );
}
