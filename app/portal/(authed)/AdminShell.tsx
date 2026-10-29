"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { LogoMark } from "../../../components/LogoMark";
import { DEFAULT_MOBILE_TABS, ICONS, type NavItem } from "./admin-nav";
import { FlashConsumer, ToastProvider } from "./Toaster";
import { MobileTabBar } from "./MobileTabBar";
import { MoreSheet } from "./MoreSheet";
import { AccountSheet } from "./AccountSheet";
import { CustomizeSheet } from "./CustomizeSheet";
import { useMobileTabs } from "./useMobileTabs";
import "./portal-shell.css";

type Persona = { name: string; email: string; role: string; initials: string };

type SheetName = "" | "more" | "account" | "customize";

type ShellControls = { openCustomize: () => void; openAccount: () => void };

const PortalShellContext = createContext<ShellControls | null>(null);

/**
 * Lets a page open one of the shell's sheets (the profile page offers
 * "Customize bottom menu"). Returns null outside the shell.
 */
export function usePortalShell(): ShellControls | null {
  return useContext(PortalShellContext);
}

export function AdminShell({
  persona,
  nav,
  role,
  children,
}: {
  persona: Persona;
  nav: NavItem[];
  role: "member" | "lead" | "pastoral";
  children: ReactNode;
}) {
  const pathname = usePathname();
  // The route the sheet was opened on is part of the state, so navigating
  // (including browser back) closes it without an effect.
  const [open, setOpen] = useState<{ sheet: SheetName; path: string }>({ sheet: "", path: "" });
  const sheet: SheetName = open.path === pathname ? open.sheet : "";
  const setSheet = (next: SheetName) => setOpen({ sheet: next, path: pathname });

  const navHrefs = useMemo(() => nav.map((n) => n.href), [nav]);
  const { tabs, save, reset, max, home } = useMobileTabs(
    role,
    navHrefs,
    DEFAULT_MOBILE_TABS[role],
  );

  // Lock body scroll behind a sheet.
  useEffect(() => {
    if (sheet) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [sheet]);

  function isActive(item: NavItem) {
    if (item.href === "/portal") return pathname === "/portal";
    return pathname === item.href || pathname.startsWith(item.href + "/");
  }

  // Longest match wins so /portal/events/pending doesn't also light up
  // /portal/events in the tab bar.
  const currentNav = useMemo(() => {
    const matches = nav.filter(isActive);
    return matches.sort((a, b) => b.href.length - a.href.length)[0] ?? null;
  }, [nav, pathname]); // eslint-disable-line react-hooks/exhaustive-deps

  const pageTitle = pathname.startsWith("/portal/profile")
    ? "Profile"
    : currentNav?.label ?? "Admin";

  const tabItems = tabs
    .map((href) => nav.find((n) => n.href === href))
    .filter((n): n is NavItem => Boolean(n));
  const restItems = nav.filter((n) => !tabs.includes(n.href));
  const activeHref = currentNav?.href ?? null;
  const currentIsInRest = restItems.some((n) => n.href === activeHref);

  // Counts for sections tucked behind More, so a pending approval is still
  // visible from the tab bar. Each badge renders nothing when its count is 0.
  const hiddenBadges = restItems
    .filter((n) => n.badgeCompact ?? n.badge)
    .map((n) => <span key={n.href}>{n.badgeCompact ?? n.badge}</span>);

  function signOut() {
    const form = document.createElement("form");
    form.method = "POST";
    form.action = "/auth/sign-out";
    document.body.appendChild(form);
    form.submit();
  }

  const controls = useMemo<ShellControls>(
    () => ({
      openCustomize: () => setOpen({ sheet: "customize", path: pathname }),
      openAccount: () => setOpen({ sheet: "account", path: pathname }),
    }),
    [pathname],
  );

  return (
    <ToastProvider>
      <PortalShellContext.Provider value={controls}>
        <FlashConsumer />
        <div style={{ minHeight: "100dvh", display: "flex", background: "#0b101c", color: "#f4f1ea" }}>
          {/* sidebar — desktop only */}
          <aside
            className="psh-sidebar"
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              bottom: 0,
              width: "248px",
              background: "#0e1525",
              borderRight: "1px solid rgba(244,241,234,.06)",
              flexDirection: "column",
              zIndex: 50,
              overflowY: "auto",
            }}
          >
            <div style={{ padding: "20px 18px 14px", display: "flex", alignItems: "center", gap: "12px" }}>
              <LogoMark size="md" />
              <span style={{ display: "flex", flexDirection: "column", lineHeight: 1 }}>
                <span
                  style={{
                    fontFamily: "var(--font-anton)",
                    fontSize: "15px",
                    color: "#f4f1ea",
                    textTransform: "uppercase",
                  }}
                >
                  Nehemiah&apos;s Temple
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

            <Link
              href="/portal/profile"
              title="Edit your profile"
              style={{
                margin: "6px 14px 14px",
                padding: "13px 14px",
                background: "#101a2e",
                border: "1px solid rgba(244,241,234,.07)",
                borderRadius: "13px",
                display: "flex",
                alignItems: "center",
                gap: "11px",
                textDecoration: "none",
                color: "inherit",
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
            </Link>

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
                    {item.badge ?? null}
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
          <div className="psh-main" style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
            <header
              style={{
                position: "sticky",
                top: 0,
                zIndex: 30,
                background: "#121a2e",
                borderBottom: "1px solid rgba(244,241,234,.08)",
                padding: "13px 16px",
                display: "flex",
                alignItems: "center",
                gap: "12px",
              }}
            >
              <span className="psh-mobile-only" style={{ flexShrink: 0 }}>
                <LogoMark size="md" />
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <h1
                  style={{
                    fontFamily: "var(--font-anton)",
                    fontWeight: 400,
                    textTransform: "uppercase",
                    color: "#f4f1ea",
                    fontSize: "clamp(20px, 3vw, 26px)",
                    lineHeight: 1,
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {pageTitle}
                </h1>
              </div>
              <div
                className="psh-hide-mobile"
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
              <button
                type="button"
                onClick={() => setSheet("account")}
                aria-label="Account and settings"
                className="psh-mobile-only"
                style={{
                  width: "46px",
                  height: "46px",
                  borderRadius: "50%",
                  border: "2px solid rgba(231,184,78,.5)",
                  background: "#e7b84e",
                  color: "#0b101c",
                  fontFamily: "var(--font-anton)",
                  fontSize: "16px",
                  cursor: "pointer",
                  flexShrink: 0,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {persona.initials}
              </button>
            </header>

            <main style={{ flex: 1, padding: "clamp(18px, 3vw, 32px)" }}>
              <div style={{ maxWidth: "1180px", margin: "0 auto" }}>{children}</div>
            </main>
          </div>

          <MobileTabBar
            items={tabItems}
            activeHref={activeHref}
            moreActive={sheet === "more" || currentIsInRest}
            moreBadge={hiddenBadges}
            onMore={restItems.length > 0 ? () => setSheet("more") : undefined}
          />

          {sheet === "more" && (
            <MoreSheet items={restItems} activeHref={activeHref} onClose={() => setSheet("")} />
          )}
          {sheet === "account" && (
            <AccountSheet
              persona={persona}
              canCustomize={nav.length > tabs.length}
              onClose={() => setSheet("")}
              onCustomize={() => setSheet("customize")}
              onSignOut={signOut}
            />
          )}
          {sheet === "customize" && (
            <CustomizeSheet
              nav={nav}
              tabs={tabs}
              max={max}
              home={home}
              onSave={save}
              onReset={reset}
              onClose={() => setSheet("")}
            />
          )}
        </div>
      </PortalShellContext.Provider>
    </ToastProvider>
  );
}
