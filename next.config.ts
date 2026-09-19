import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      // The admin area became the unified member/lead/pastoral portal.
      // Keep old staff bookmarks and email links working.
      {
        source: "/admin",
        destination: "/portal",
        permanent: true,
      },
      {
        source: "/admin/:path*",
        destination: "/portal/:path*",
        permanent: true,
      },
      // Safety nets: when an auth email's redirect falls back to the Site URL
      // (e.g. a link sent from the Supabase dashboard, whose {{ .RedirectTo }}
      // is the bare Site URL), the params land on the homepage. Hand them to
      // the right auth route so the flow still completes.
      {
        source: "/",
        has: [{ type: "query", key: "code" }],
        destination: "/auth/callback",
        permanent: false,
      },
      {
        source: "/",
        has: [{ type: "query", key: "token_hash" }],
        destination: "/auth/confirm",
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
