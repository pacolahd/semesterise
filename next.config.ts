import type { NextConfig } from "next";

import createJiti from "jiti";
import { fileURLToPath } from "node:url";

const jiti = createJiti(fileURLToPath(import.meta.url));

// Import env here to validate during build. Using jiti@^1 we can import .ts files :)
jiti("./src/env/server.ts");

const nextConfig: NextConfig = {
  transpilePackages: ["better-auth"],

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
