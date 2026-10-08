"use client";

import { useMemo } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { effectComponents } from "@/effects/components";
import { getEffect } from "@/effects/registry";
import { parseParams } from "@/effects/types";

export default function OverlayHost() {
  const { effect: id } = useParams<{ effect: string }>();
  const searchParams = useSearchParams();

  const effect = getEffect(id);
  const Component = effect ? effectComponents[effect.id] : undefined;
  const params = useMemo(
    () => (effect ? parseParams(effect, searchParams) : null),
    [effect, searchParams],
  );

  if (!effect || !Component || !params) {
    return <div className="overlay-error">Unknown effect: {id}</div>;
  }
  return <Component params={params} />;
}
