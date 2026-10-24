import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

// Product and banner images are served from Supabase Storage public buckets.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const storage = supabaseUrl ? new URL("/storage/v1/object/public/**", supabaseUrl) : null;

const nextConfig: NextConfig = {
  poweredByHeader: false,
  images: {
    remotePatterns: storage ? [storage] : [],
    formats: ["image/avif", "image/webp"],
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
};

export default withNextIntl(nextConfig);
