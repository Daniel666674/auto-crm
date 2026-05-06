import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  basePath: "/app",
  serverExternalPackages: ["better-sqlite3", "bcryptjs", "node-cron", "web-push", "googleapis"],
  typescript: {
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
