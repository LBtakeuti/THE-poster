import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Supabase Storage の公開画像（posters バケット）を next/image で扱う場合の許可。
  // 実際のホストは NEXT_PUBLIC_SUPABASE_URL に従う。Phase 2 以降で使用。
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
};

export default nextConfig;
