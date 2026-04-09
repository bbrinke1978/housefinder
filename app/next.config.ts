import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["mapbox-gl"],
  serverExternalPackages: ["@react-pdf/renderer"],
  images: {
    remotePatterns: [
      { protocol: "https" as const, hostname: "*.blob.core.windows.net" },
    ],
  },
};

export default nextConfig;
