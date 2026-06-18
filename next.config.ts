import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  // Allow large file uploads (phone photos can be 5-10MB each; admin may upload
  // multiple product images at once). The default body size limit would reject
  // these — raised to 25MB to comfortably handle multi-image product uploads.
  experimental: {
    serverActions: {
      bodySizeLimit: "25mb",
    },
  },
};

export default nextConfig;
