"use client";

import { useEffect, useState } from "react";
import { effectComponents } from "@/effects/components";
import { getEffect } from "@/effects/registry";
import { planPlayback, type ParamValues } from "@/effects/types";
import { dequeue, onQueueChange } from "@/lib/queue";

// Fallback in case a storage event is missed
const POLL_MS = 1000;

interface Playing {
  id: string;
  effect: string;
  params: ParamValues;
  seconds: number;
}

/** Plays queued effects one after another; shows nothing while the queue is empty. */
export default function QueuePlayer() {
  const [playing, setPlaying] = useState<Playing | null>(null);

  // While idle, take the next item as soon as one is queued
  useEffect(() => {
    if (playing) return;

    const takeNext = () => {
      let item = dequeue();
      // Skip items for effects this build doesn't have
      while (item && !getEffect(item.effect)) item = dequeue();
      const effect = item && getEffect(item.effect);
      if (!item || !effect) return;
      setPlaying({
        id: item.id,
        effect: effect.id,
        ...planPlayback(effect, item.params),
      });
    };

    const first = window.setTimeout(takeNext, 0);
    const poll = window.setInterval(takeNext, POLL_MS);
    const unsubscribe = onQueueChange(takeNext);
    return () => {
      window.clearTimeout(first);
      window.clearInterval(poll);
      unsubscribe();
    };
  }, [playing]);

  useEffect(() => {
    if (!playing) return;
    const timer = window.setTimeout(
      () => setPlaying(null),
      playing.seconds * 1000,
    );
    return () => window.clearTimeout(timer);
  }, [playing]);

  if (!playing) return null;
  const Component = effectComponents[playing.effect];
  return <Component key={playing.id} params={playing.params} />;
}
