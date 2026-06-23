"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { ICONS, type NavItem } from "./admin-nav";

type Persona = { name: string; email: string; role: string; initials: string };

export function AdminShell({
  persona,
  nav,
  children,
}: {
  persona: Persona;
  nav: NavItem[];
  children: ReactNode;
}) {
  const pathname = usePathname();
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Close drawer when the route changes (navigation through sidebar).
  useEffect(() => setDrawerOpen(false), [pathname]);
  // Lock body scroll while drawer is open.
  useEffect(() => {
    if (drawerOpen) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [drawerOpen]);

  const currentNav = nav.find((n) => pathname === n.href || (n.href !== "/admin" && pathname.startsWith(n.href)));
  const pageTitle = currentNav?.label ?? "Admin";

  function isActive(item: NavItem) {
    if (item.href === "/admin") return pathname === "/admin";
    return pathname === item.href || pathname.startsWith(item.href + "/");
  }

  function signOut() {
    const form = document.createElement("form");
    form.method = "POST";
    form.action = "/auth/sign-out";
    document.body.appendChild(form);
    form.submit();
  }

  return (
    <div style={{ minHeight: "100dvh", display: "flex", background: "#0b101c", color: "#f4f1ea" }}>
      {/* mobile backdrop */}
      {drawerOpen && (
        <div
          onClick={() => setDrawerOpen(false)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,.55)",
            zIndex: 40,
          }}
        />
      )}

      {/* sidebar */}
      <aside
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          bottom: 0,
          width: "248px",
          background: "#0e1525",
          borderRight: "1px solid rgba(244,241,234,.06)",
          display: "flex",
          flexDirection: "column",
          zIndex: 50,
          transform: drawerOpen ? "translateX(0)" : "translateX(-100%)",
          transition: "transform .22s ease",
          overflowY: "auto",
        }}
        className="admin-sidebar"
      >
        <div style={{ padding: "20px 18px 14px", display: "flex", alignItems: "center", gap: "11px" }}>
          <span
            style={{
              width: "40px",
              height: "40px",
              borderRadius: "9px",
              background: "#e7b84e",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
              fontFamily: "var(--font-anton)",
              fontSize: "18px",
              color: "#0b101c",
            }}
          >
            NT
          </span>
          <span style={{ display: "flex", flexDirection: "column", lineHeight: 1 }}>
            <span
              style={{
                fontFamily: "var(--font-anton)",
                fontSize: "15px",
                color: "#f4f1ea",
                textTransform: "uppercase",
              }}
            >
              Neh Temple
            </span>
            <span
              style={{
                fontSize: "9px",
                fontWeight: 800,
                letterSpacing: "0.22em",
                textTransform: "uppercase",
                color: "#e7b84e",
                marginTop: "4px",
              }}
            >
              Admin
            </span>
          </span>
        </div>

        <div
          style={{
            margin: "6px 14px 14px",
            padding: "13px 14px",
            background: "#101a2e",
            border: "1px solid rgba(244,241,234,.07)",
            borderRadius: "13px",
            display: "flex",
            alignItems: "center",
            gap: "11px",
          }}
        >
          <span
            style={{
              width: "38px",
              height: "38px",
              borderRadius: "50%",
              background: "#e7b84e",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
              fontFamily: "var(--font-anton)",
              fontSize: "14px",
              color: "#0b101c",
            }}
          >
            {persona.initials}
          </span>
          <div style={{ minWidth: 0 }}>
            <div
              style={{
                fontWeight: 800,
                fontSize: "13.5px",
                color: "#f4f1ea",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {persona.name}
            </div>
            <div
              style={{
                fontSize: "11px",
                color: "#e7b84e",
                fontWeight: 700,
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {persona.role}
            </div>
          </div>
        </div>

        <nav style={{ flex: 1, padding: "4px 12px", display: "flex", flexDirection: "column", gap: "3px" }}>
          {nav.map((item) => {
            const on = isActive(item);
            return (
              <Link
                key={item.href}
                href={item.href}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "11px",
                  padding: "11px 13px",
                  borderRadius: "10px",
                  color: on ? "#0b101c" : "#cdd3e0",
                  background: on ? "#e7b84e" : "transparent",
                  fontWeight: on ? 800 : 600,
                  fontSize: "13.5px",
                  textDecoration: "none",
                  transition: "background .12s, color .12s",
                }}
              >
                <span style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 20, height: 20 }}>
                  {item.icon}
                </span>
                <span style={{ flex: 1 }}>{item.label}</span>
                {item.badge && item.badge > 0 ? (
                  <span
                    style={{
                      background: on ? "#0b101c" : "#e7b84e",
                      color: on ? "#e7b84e" : "#0b101c",
                      fontSize: "10.5px",
                      fontWeight: 800,
                      minWidth: "19px",
                      height: "19px",
                      borderRadius: "10px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      padding: "0 5px",
                    }}
                  >
                    {item.badge}
                  </span>
                ) : null}
              </Link>
            );
          })}
        </nav>

        <div style={{ padding: "12px 14px 18px" }}>
          <button
            type="button"
            onClick={signOut}
            style={{
              width: "100%",
              display: "flex",
              alignItems: "center",
              gap: "11px",
              background: "transparent",
              border: "1px solid rgba(244,241,234,.12)",
              color: "#9aa3b8",
              fontWeight: 700,
              fontSize: "13.5px",
              padding: "12px 14px",
              borderRadius: "11px",
              cursor: "pointer",
            }}
          >
            <span style={{ display: "flex", width: 18, height: 18 }}>{ICONS.signOut}</span>
            Sign Out
          </button>
        </div>
      </aside>

      {/* main column */}
      <div
        className="admin-main"
        style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", marginLeft: "0" }}
      >
        <header
          style={{
            position: "sticky",
            top: 0,
            zIndex: 30,
            background: "#121a2e",
            borderBottom: "1px solid rgba(244,241,234,.08)",
            padding: "13px 20px",
            display: "flex",
            alignItems: "center",
            gap: "14px",
          }}
        >
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            aria-label="Open menu"
            className="admin-hamburger"
            style={{
              width: "42px",
              height: "42px",
              borderRadius: "10px",
              background: "#1a2438",
              border: "1px solid rgba(244,241,234,.08)",
              color: "#f4f1ea",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
            }}
          >
            <span style={{ display: "flex", width: 22, height: 22 }}>{ICONS.menu}</span>
          </button>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h1
              style={{
                fontFamily: "var(--font-anton)",
                fontWeight: 400,
                textTransform: "uppercase",
                color: "#f4f1ea",
                fontSize: "clamp(20px, 3vw, 26px)",
                lineHeight: 1,
              }}
            >
              {pageTitle}
            </h1>
          </div>
          <div
            style={{
              fontSize: "12.5px",
              color: "#9aa3b8",
              fontWeight: 600,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
              maxWidth: "260px",
            }}
          >
            {persona.email}
          </div>
        </header>

        <main
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "clamp(18px, 3vw, 32px)",
          }}
        >
          <div style={{ maxWidth: "1180px", margin: "0 auto" }}>{children}</div>
        </main>
      </div>

      <style>{`
        @media (min-width: 960px) {
          .admin-sidebar { transform: translateX(0) !important; }
          .admin-main { margin-left: 248px !important; }
          .admin-hamburger { display: none !important; }
        }
      `}</style>
    </div>
  );
}
