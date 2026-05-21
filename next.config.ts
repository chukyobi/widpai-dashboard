import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Reduce console noise during dev startup
  logging: {
    fetches: {
      fullUrl: false,
    },
  },
  // Ignore typescript errors on Vercel
  typescript: {
    ignoreBuildErrors: true,
  },
  // Ignore eslint errors on Vercel (avoids plugin incompatibilities)
  eslint: {
    ignoreDuringBuilds: true,
  },
  // Reduce unnecessary experimental warnings
  experimental: {
    // Use optimized package imports for large icon/component libraries
    optimizePackageImports: ['lucide-react'],
  },
};

export default nextConfig;
