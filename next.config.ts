import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // Default is 1 MB; feedback photos may ride along in the submit
      // FormData (capped client- and server-side at 4 MB — Vercel rejects
      // request bodies over 4.5 MB).
      bodySizeLimit: "5mb",
    },
  },
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
      // Printed NFC tags and QR codes point at /?checkin — keep them working.
      {
        source: "/",
        has: [{ type: "query", key: "checkin" }],
        destination: "/checkin",
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
