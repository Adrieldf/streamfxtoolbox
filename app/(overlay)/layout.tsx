import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./overlay.css";

export const metadata: Metadata = {
  title: "StreamFX overlay",
};

export default function OverlayLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className="overlay">
      <body>{children}</body>
    </html>
  );
}
