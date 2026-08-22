import type { NextConfig } from "next";

const localApi = "http://localhost:8000";

const nextConfig: NextConfig = {
  async rewrites() {
    if (process.env.NODE_ENV !== "development") return [];
    return [
      { source: "/api/auth/:path*", destination: `${localApi}/api/auth/:path*` },
      { source: "/api/recipients", destination: `${localApi}/api/recipients` },
      { source: "/api/recipients/:path*", destination: `${localApi}/api/recipients/:path*` },
    ];
  },
};

export default nextConfig;
