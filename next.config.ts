import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  // Fail production builds on TypeScript errors — do not ship broken types.
  typescript: {
    ignoreBuildErrors: false,
  },
};

export default nextConfig;
