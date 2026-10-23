import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  distDir: process.env.PRACTISYNC_BUILD_DIR || '.next',
  experimental: {
    authInterrupts: true,
  },
};

export default nextConfig;
