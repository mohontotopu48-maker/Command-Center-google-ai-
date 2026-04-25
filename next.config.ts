import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: [
    "preview-chat-ac7b0dbc-cd1b-4268-b343-e5bc8b30b5d6.space.z.ai",
  ],
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "ALLOWALL" },
          { key: "Content-Security-Policy", value: "frame-ancestors * *" },
        ],
      },
    ];
  },
};

export default nextConfig;
