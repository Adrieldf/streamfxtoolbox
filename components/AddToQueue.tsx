"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { getEffect } from "@/effects/registry";
import { parseParams } from "@/effects/types";
import { enqueue } from "@/lib/queue";

/** Opening this page queues the effect named in the URL, with the URL's params. */
export default function AddToQueue() {
  const { effect: id } = useParams<{ effect: string }>();
  const searchParams = useSearchParams();
  const [message, setMessage] = useState("");
  // Effects run twice in dev (Strict Mode); one page load must queue one item
  const added = useRef(false);

  useEffect(() => {
    if (added.current) return;
    added.current = true;

    const effect = getEffect(id);
    let result = `Unknown effect: ${id}`;
    if (effect) {
      const position = enqueue(effect.id, parseParams(effect, searchParams));
      result =
        position === null
          ? "The queue is full"
          : `Queued ${effect.name} at position ${position}`;
    }
    queueMicrotask(() => setMessage(result));
  }, [id, searchParams]);

  return <div className="overlay-note">{message}</div>;
}
