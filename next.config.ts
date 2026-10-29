import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Smaller files than the default (WebP only) for the same quality.
    formats: ["image/avif", "image/webp"],
  },
  experimental: {
    // Keep pages the user has already opened in the browser's router cache for
    // 30 seconds, so going back and forth between sections is instant instead of
    // asking the server again. router.refresh() and Server Actions still clear
    // it. Lower this (or set it to 0) if a page needs to always show live data.
    staleTimes: { dynamic: 30 },
  },
};

export default nextConfig;
