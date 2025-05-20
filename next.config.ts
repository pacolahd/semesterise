import type { NextConfig } from "next";

import createJiti from "jiti";
import path from "node:path";
import { fileURLToPath } from "node:url";

const jiti = createJiti(fileURLToPath(import.meta.url));

// Import env here to validate during build. Using jiti@^1 we can import .ts files :)
jiti("./src/env/server.ts");

const nextConfig: NextConfig = {
  output: "standalone",

  transpilePackages: ["better-auth"],
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      react: path.resolve("./node_modules/react"),
      "react-dom": path.resolve("./node_modules/react-dom"),
    };
    return config;
  },
  /* config options here */
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  experimental: {
    authInterrupts: true,
    serverActions: {
      allowedOrigins: ["localhost:3000", "semesterise.pacolahd.com"],
      bodySizeLimit: "2mb",
    },
  },
};

export default nextConfig;
