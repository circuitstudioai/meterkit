import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  transpilePackages: ["@meterkit/sdk", "@meterkit/config", "@meterkit/react"],
  serverExternalPackages: ["better-sqlite3", "postgres", "@google/genai"],
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
