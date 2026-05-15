import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  trailingSlash: false,
  images: { unoptimized: true },
  reactStrictMode: true,
  // Build vai para backend/manager/dist (embedado pelo Go).
  distDir: ".next",
};

export default nextConfig;
