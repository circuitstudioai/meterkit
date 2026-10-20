import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  agentRules: false,
  transpilePackages: ["@meterkit/sdk", "@meterkit/react", "@meterkit/config"],
  serverExternalPackages: ["@google/genai"],
};

export default nextConfig;
