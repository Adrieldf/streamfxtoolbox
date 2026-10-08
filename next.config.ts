import type { NextConfig } from "next";

// On GitHub Pages the site lives under /<repository name>. The deploy workflow
// sets this; locally it stays empty so the app runs at the root.
const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

const nextConfig: NextConfig = {
  // Static export: the whole app is plain files, so it can be hosted on GitHub Pages
  output: "export",
  basePath,
  env: {
    NEXT_PUBLIC_BASE_PATH: basePath,
  },
  // The dev badge would otherwise show up on stream when the overlay runs from `next dev`.
  devIndicators: false,
};

export default nextConfig;
