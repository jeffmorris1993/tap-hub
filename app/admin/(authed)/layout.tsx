import Link from "next/link";
import { redirect } from "next/navigation";
import { getAdminUser } from "../../../lib/supabase/auth";
import { LogoMark } from "../../../components/LogoMark";
import { SignOutButton } from "./SignOutButton";

const NAV = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/submissions", label: "Inbox" },
  { href: "/admin/events", label: "Events" },
  { href: "/admin/today", label: "Today" },
  { href: "/admin/kids-youth", label: "Kids + Youth" },
  { href: "/admin/agent", label: "Agent" },
  { href: "/admin/agent-log", label: "Agent Log" },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getAdminUser();
  if (!user) redirect("/admin/login");

  return (
    <div style={{ minHeight: "100dvh", background: "#070b14" }}>
      <header
        style={{
          position: "sticky",
          top: 0,
          zIndex: 30,
          background: "rgba(11,16,28,.94)",
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
          borderBottom: "1px solid rgba(244,241,234,.08)",
        }}
      >
        <div
          style={{
            maxWidth: "1180px",
            margin: "0 auto",
            padding: "14px 22px",
            display: "flex",
            alignItems: "center",
            gap: "20px",
            flexWrap: "wrap",
          }}
        >
          <Link
            href="/admin"
            style={{ display: "flex", alignItems: "center", gap: "11px", textDecoration: "none", color: "#f4f1ea" }}
          >
            <LogoMark size="sm" />
            <span style={{ display: "flex", flexDirection: "column", lineHeight: 1 }}>
              <span
                style={{
                  fontFamily: "var(--font-anton)",
                  fontSize: "15px",
                  letterSpacing: "0.02em",
                  textTransform: "uppercase",
                }}
              >
                Nehemiah&apos;s Temple
              </span>
              <span
                style={{
                  fontSize: "9px",
                  fontWeight: 800,
                  letterSpacing: "0.28em",
                  textTransform: "uppercase",
                  color: "#e7b84e",
                  marginTop: "3px",
                }}
              >
                TapHub Admin
              </span>
            </span>
          </Link>
          <nav style={{ display: "flex", gap: "4px", flex: 1, flexWrap: "wrap", minWidth: 0 }}>
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                style={{
                  color: "#cdd3e0",
                  fontWeight: 700,
                  fontSize: "13px",
                  letterSpacing: "0.04em",
                  textTransform: "uppercase",
                  padding: "8px 12px",
                  borderRadius: "8px",
                  textDecoration: "none",
                }}
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <span style={{ color: "#9aa3b8", fontSize: "12.5px", fontWeight: 600 }}>{user.email}</span>
            <SignOutButton />
          </div>
        </div>
      </header>
      <main style={{ maxWidth: "1180px", margin: "0 auto", padding: "28px 22px 80px" }}>{children}</main>
    </div>
  );
}
