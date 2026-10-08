import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./panel.css";

export const metadata: Metadata = {
  title: "StreamFX Toolbox",
  description: "Test stream overlay effects and copy their browser-source URLs.",
};

export default function PanelLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="panel">{children}</body>
    </html>
  );
}
