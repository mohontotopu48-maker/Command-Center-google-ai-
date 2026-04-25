import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow all Z-space preview origins
  allowedDevOrigins: [".*"],
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "Access-Control-Allow-Origin", value: "*" },
          { key: "Access-Control-Allow-Methods", value: "GET,POST,PUT,DELETE,PATCH,OPTIONS" },
          { key: "Access-Control-Allow-Headers", value: "Content-Type,Authorization" },
          { key: "X-Frame-Options", value: "ALLOWALL" },
          { key: "Content-Security-Policy", value: "frame-ancestors * *" },
        ],
      },
    ];
  },
};

export default nextConfig;
