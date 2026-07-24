import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Prevent Turbopack from looking at parent directory
  turbopack: {
    root: __dirname,
  },
};

export default nextConfig;
