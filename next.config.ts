import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  basePath: "/app",
  serverExternalPackages: ["better-sqlite3", "bcryptjs", "node-cron", "web-push", "googleapis"],
  typescript: {
    ignoreBuildErrors: true,
  },
  async redirects() {
    return [
      {
        source: "/",
        destination: "/app",
        permanent: false,
        basePath: false,
      },
    ];
  },
};

export default nextConfig;
