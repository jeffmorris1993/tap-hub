import { PhoneShell } from "../../components/PhoneShell";
import { BackBar } from "../../components/BackBar";
import { SectionLabel } from "../../components/SectionLabel";
import { MemoryMatch } from "../../components/MemoryMatch";

// Seed data — Phase 2 reads from Supabase.
const TEACHING_TODAY = {
  topic: "The Armor of God",
  reference: "Ephesians 6:10–18",
  teacher: "Standing firm in faith · Led by the Ignite team",
};

const PROGRAMS = [
  { age: "0–3", name: "Nursery", detail: "Loving care during all services · Room A" },
  { age: "4–11", name: "Kids Church", detail: "Sundays 12 PM · Room B · worship + lesson" },
  { age: "12–18", name: "Ignite Youth", detail: "Sun 10:30 AM & Wed 7 PM · Youth Hall" },
];

const PARENT_RESOURCES = [
  { title: "This Week's Take-Home", sub: "Lesson + verse", iconPath: "M4 5h11a2 2 0 012 2v12a3 3 0 00-3-3H4z M20 5h-3a2 2 0 00-2 2v12a3 3 0 013-3h2z" },
  { title: "Check-In & Safety", sub: "How drop-off works", iconPath: "M12 3l7 3v5c0 4.5-3 8-7 10-4-2-7-5.5-7-10V6z M9.5 12l1.8 1.8 3.2-3.6" },
  { title: "Family Devotional", sub: "Daily at home", iconPath: "M12 8 m-3 0 a 3 3 0 1 0 6 0 a 3 3 0 1 0 -6 0 M5 20c0-3.5 3-6 7-6s7 2.5 7 6" },
  { title: "Ignite Newsletter", sub: "Youth updates", iconPath: "M3 5h18v14H3z M3 7l9 6 9-6" },
];

export default function KidsYouth() {
  return (
    <PhoneShell>
      <div className="th-slide" style={{ minHeight: "100vh" }}>
        <BackBar title="Kids + Youth" subtitle="Ignite · all ages" />

        <div style={{ padding: "18px 18px 40px" }}>
          {/* ignite banner */}
          <div style={{ position: "relative", borderRadius: "18px", overflow: "hidden" }}>
            <div
              style={{
                width: "100%",
                height: "170px",
                background:
                  "linear-gradient(135deg, hsl(28 70% 35%), hsl(8 60% 22%)), radial-gradient(circle at 30% 40%, rgba(255,200,80,.4), transparent 60%)",
              }}
            />
            <div
              style={{
                position: "absolute",
                inset: 0,
                background: "linear-gradient(120deg, rgba(11,16,28,.9), rgba(11,16,28,.3))",
              }}
            />
            <div style={{ position: "absolute", left: "18px", bottom: "16px", right: "18px" }}>
              <span
                style={{
                  display: "inline-block",
                  background: "#e7b84e",
                  color: "#6b531a",
                  fontSize: "10px",
                  fontWeight: 800,
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  padding: "5px 11px",
                  borderRadius: "6px",
                }}
              >
                Ignite Youth
              </span>
              <h2
                style={{
                  fontFamily: "var(--font-anton)",
                  fontWeight: 400,
                  textTransform: "uppercase",
                  fontSize: "25px",
                  lineHeight: 1,
                  marginTop: "9px",
                }}
              >
                Ages 12–18
              </h2>
              <div style={{ fontSize: "12.5px", color: "#cdd3e0", fontWeight: 700, marginTop: "4px" }}>
                Sundays 10:30 AM · Wednesdays 7 PM · Youth Hall
              </div>
            </div>
          </div>

          {/* today's lesson */}
          <div
            style={{
              marginTop: "16px",
              background: "linear-gradient(135deg,#15203a,#0f1626)",
              border: "1px solid rgba(231,184,78,.3)",
              borderRadius: "16px",
              padding: "18px",
            }}
          >
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                background: "rgba(231,184,78,.14)",
                borderRadius: "20px",
                padding: "5px 12px",
              }}
            >
              <span
                className="th-pulse"
                style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#e7b84e" }}
              />
              <span
                style={{
                  fontSize: "10px",
                  fontWeight: 800,
                  letterSpacing: "0.14em",
                  textTransform: "uppercase",
                  color: "#e7b84e",
                }}
              >
                Teaching Today
              </span>
            </div>
            <h3
              style={{
                fontFamily: "var(--font-anton)",
                fontWeight: 400,
                textTransform: "uppercase",
                fontSize: "23px",
                lineHeight: 1.03,
                marginTop: "12px",
              }}
            >
              {TEACHING_TODAY.topic}
            </h3>
            <p style={{ color: "#9aa3b8", fontSize: "13.5px", fontWeight: 600, marginTop: "6px" }}>
              {TEACHING_TODAY.reference} · {TEACHING_TODAY.teacher}
            </p>
          </div>

          {/* programming */}
          <SectionLabel style={{ margin: "26px 0 12px" }}>Programming For All Ages</SectionLabel>
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {PROGRAMS.map((p) => (
              <div
                key={p.age}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "14px",
                  background: "#121a2e",
                  border: "1px solid rgba(244,241,234,.08)",
                  borderRadius: "14px",
                  padding: "15px 16px",
                }}
              >
                <span
                  style={{
                    width: "48px",
                    height: "48px",
                    borderRadius: "12px",
                    background: "#1a2438",
                    border: "1px solid rgba(231,184,78,.25)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                    fontFamily: "var(--font-anton)",
                    fontSize: "14px",
                    color: "#e7b84e",
                  }}
                >
                  {p.age}
                </span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 800, fontSize: "15px" }}>{p.name}</div>
                  <div style={{ fontSize: "12.5px", color: "#9aa3b8", fontWeight: 600, marginTop: "2px" }}>
                    {p.detail}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* parent resources */}
          <SectionLabel style={{ margin: "26px 0 12px" }}>Parent Resources</SectionLabel>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
            {PARENT_RESOURCES.map((r) => (
              <div
                key={r.title}
                style={{
                  background: "#121a2e",
                  border: "1px solid rgba(244,241,234,.08)",
                  borderRadius: "14px",
                  padding: "15px",
                }}
              >
                <span
                  style={{
                    width: "38px",
                    height: "38px",
                    borderRadius: "10px",
                    background: "#1a2438",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="#e7b84e" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                    <path d={r.iconPath} />
                  </svg>
                </span>
                <div style={{ fontWeight: 800, fontSize: "13.5px", marginTop: "11px", lineHeight: 1.2 }}>
                  {r.title}
                </div>
                <div style={{ fontSize: "11.5px", color: "#9aa3b8", fontWeight: 600, marginTop: "3px" }}>
                  {r.sub}
                </div>
              </div>
            ))}
          </div>

          {/* kids game */}
          <SectionLabel style={{ margin: "26px 0 12px" }}>Games For Kids</SectionLabel>
          <MemoryMatch />
        </div>
      </div>
    </PhoneShell>
  );
}
