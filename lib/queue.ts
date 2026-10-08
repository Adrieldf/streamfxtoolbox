import type { ParamValues } from "@/effects/types";

export interface QueueItem {
  id: string;
  effect: string;
  params: ParamValues;
  /** When it was queued, in ms since epoch */
  at: number;
}

// The queue lives in localStorage, so it is shared by every page of this site
// opened in the same browser (for OBS: its browser sources and docks), and by
// nothing else. There is no server.
const STORAGE_KEY = "streamfx_queue";
const MAX_ITEMS = 100;
// Items nobody played, e.g. queued while the overlay was closed, are dropped
// so they don't all fire at the start of the next stream.
const MAX_AGE_MS = 10 * 60 * 1000;

function read(): QueueItem[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]");
    if (!Array.isArray(parsed)) return [];
    const oldest = Date.now() - MAX_AGE_MS;
    return parsed.filter((item) => item?.at >= oldest);
  } catch {
    return [];
  }
}

function write(queue: QueueItem[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(queue));
}

/** Returns the item's 1-based position, or null when the queue is full. */
export function enqueue(effect: string, params: ParamValues): number | null {
  const queue = read();
  if (queue.length >= MAX_ITEMS) return null;
  queue.push({ id: crypto.randomUUID(), effect, params, at: Date.now() });
  write(queue);
  return queue.length;
}

export function dequeue(): QueueItem | null {
  const queue = read();
  const item = queue.shift() ?? null;
  if (item) write(queue);
  return item;
}

export function clearQueue(): number {
  const removed = read().length;
  localStorage.removeItem(STORAGE_KEY);
  return removed;
}

/** Calls `listener` when another page of this site changes the queue. */
export function onQueueChange(listener: () => void): () => void {
  const handler = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY || e.key === null) listener();
  };
  window.addEventListener("storage", handler);
  return () => window.removeEventListener("storage", handler);
}
