import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Lets the dev server be reached from other devices on the local network
  // (e.g. testing on a phone) instead of only localhost.
  allowedDevOrigins: ["10.105.241.205"],
};

export default nextConfig;
