import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: [
    "preview-chat-ac7b0dbc-cd1b-4268-b343-e5bc8b30b5d6.space.z.ai",
  ],
  // Allow Z-space preview embedding while restricting other origins
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Content-Security-Policy", value: "frame-ancestors 'self' *.z.ai" },
        ],
      },
    ];
  },
};

export default nextConfig;
