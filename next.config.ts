import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  allowedDevOrigins: [
    "preview-chat-ac7b0dbc-cd1b-4268-b343-e5bc8b30b5d6.space.z.ai",
  ],
  // Allow cross-origin iframe embedding for Z-space preview
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "ALLOWALL" },
          { key: "Content-Security-Policy", value: "frame-ancestors * 'self'" },
        ],
      },
    ];
  },
};

export default nextConfig;
