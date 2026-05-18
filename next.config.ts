import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Reduce console noise during dev startup
  logging: {
    fetches: {
      fullUrl: false,
    },
  },
  // Speed up TypeScript checks (type-check separately with tsc --noEmit)
  typescript: {
    ignoreBuildErrors: false,
  },
  // Reduce unnecessary experimental warnings
  experimental: {
    // Use optimized package imports for large icon/component libraries
    optimizePackageImports: ['lucide-react'],
  },
};

export default nextConfig;
