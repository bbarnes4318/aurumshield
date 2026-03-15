import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone", // Critical for reducing Docker image size on AWS ECS
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
    ],
  },
};

export default nextConfig;
