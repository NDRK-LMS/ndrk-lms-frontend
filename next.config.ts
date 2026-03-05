import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Ensure local shared package is bundled correctly
  transpilePackages: ["@ndrk/shared"],
};

export default nextConfig;
