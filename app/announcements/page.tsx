import Link from "next/link";
import { PhoneShell } from "../../components/PhoneShell";
import { BackBar } from "../../components/BackBar";
import { AnnouncementListCard } from "../../components/AnnouncementCard";
import {
  listAnnouncements,
  filterByCategory,
  ANNOUNCEMENT_CATEGORIES,
} from "../../lib/announcements";

export const revalidate = 60;

type Search = { tab?: string };

export default async function AnnouncementsPage({
  searchParams,
}: {
  searchParams: Promise<Search>;
}) {
  const { tab } = await searchParams;
  const tabs = ["All", ...ANNOUNCEMENT_CATEGORIES] as const;
  const active: (typeof tabs)[number] = tabs.includes(
    (tab ?? "All") as (typeof tabs)[number],
  )
    ? ((tab ?? "All") as (typeof tabs)[number])
    : "All";

  const all = await listAnnouncements();
  const items = filterByCategory(all, active);

  return (
    <PhoneShell>
      <div className="th-slide" style={{ minHeight: "100dvh" }}>
        <BackBar title="Announcements" subtitle="Stay in the loop" />

        {/* Filter tabs */}
        <div
          className="tap-scroll"
          style={{
            padding: "16px 18px 8px",
            display: "flex",
            gap: "8px",
            overflowX: "auto",
          }}
        >
          {tabs.map((t) => {
            const on = t === active;
            const href = t === "All" ? "/announcements" : `/announcements?tab=${encodeURIComponent(t)}`;
            return (
              <Link
                key={t}
                href={href}
                style={{
                  whiteSpace: "nowrap",
                  fontWeight: 800,
                  fontSize: "12.5px",
                  letterSpacing: "0.05em",
                  textTransform: "uppercase",
                  padding: "11px 18px",
                  borderRadius: "10px",
                  textDecoration: "none",
                  background: on ? "#e7b84e" : "#121a2e",
                  color: on ? "#0b101c" : "#cdd3e0",
                  border: `1.5px solid ${on ? "#e7b84e" : "rgba(244,241,234,.12)"}`,
                }}
              >
                {t}
              </Link>
            );
          })}
        </div>

        {/* Cards */}
        <div
          style={{
            padding: "8px 18px 40px",
            display: "flex",
            flexDirection: "column",
            gap: "14px",
          }}
        >
          {items.length === 0 ? (
            <div
              style={{
                background: "#121a2e",
                border: "1px solid rgba(244,241,234,.08)",
                borderRadius: "16px",
                padding: "32px 20px",
                textAlign: "center",
                color: "#9aa3b8",
                fontSize: "14px",
              }}
            >
              Nothing here right now. Check back soon.
            </div>
          ) : (
            items.map((a) => <AnnouncementListCard key={a.id} a={a} />)
          )}
        </div>
      </div>
    </PhoneShell>
  );
}
