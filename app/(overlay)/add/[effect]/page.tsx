import { Suspense } from "react";
import AddToQueue from "@/components/AddToQueue";
import { effects } from "@/effects/registry";

export function generateStaticParams() {
  return effects.map((e) => ({ effect: e.id }));
}

export default function AddPage() {
  return (
    <Suspense fallback={null}>
      <AddToQueue />
    </Suspense>
  );
}
