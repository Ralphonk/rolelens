import type { NextConfig } from "next";
const config: NextConfig = {
  turbopack: {
    root: import.meta.dirname,
  },
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${process.env.API_INTERNAL_URL || "http://127.0.0.1:4002"}/api/:path*`,
      },
    ];
  },
};
export default config;
