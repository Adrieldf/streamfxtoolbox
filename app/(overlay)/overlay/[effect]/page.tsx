import { Suspense } from "react";
import OverlayHost from "@/components/OverlayHost";
import { effects } from "@/effects/registry";

export function generateStaticParams() {
  return effects.map((e) => ({ effect: e.id }));
}

export default function OverlayPage() {
  return (
    <Suspense fallback={null}>
      <OverlayHost />
    </Suspense>
  );
}
