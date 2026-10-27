"use client";

import { useEffect, useState, type CSSProperties, type ReactNode } from "react";
import {
  ATTENDEE_TYPE_LABEL,
  DOW_LABEL,
  FOLLOW_UP_LABEL,
  type AttendeeType,
  type FollowUpStatus,
} from "../../../../lib/attendance";
import {
  addOneOffService,
  deleteOneOffService,
  setFollowUpStatus,
  setOccurrenceDidNotOccur,
  updateRecurringService,
} from "./actions";

export type OccurrenceView = {
  key: string;
  serviceId: string;
  serviceName: string;
  date: string;
  dateLabel: string;
  timeLabel: string;
  status: "upcoming" | "held" | "skipped";
  count: number;
  kind: "recurring" | "oneoff";
};

export type CheckinView = {
  id: string;
  attendeeId: string;
  name: string;
  type: AttendeeType;
  occKey: string;
  serviceLabel: string;
  timeLabel: string;
  ts: string;
};

export type PersonView = {
  id: string;
  name: string;
  type: AttendeeType;
  firstLabel: string;
  total: number;
  attended: number;
  eligible: number;
  hasContact: boolean;
  contactLabel: string;
  prefLabel: string;
  rows: { service: string; time: string }[];
};

export type FlagView = {
  attendeeId: string;
  name: string;
  miss: number;
  lastLabel: string;
  status: FollowUpStatus;
};

export type GuestView = {
  attendeeId: string;
  name: string;
  visits: number;
  firstLabel: string;
  lastLabel: string;
  returned: boolean;
  hasContact: boolean;
  contact: string;
  pref: string;
};

export type TrendBar = { date: string; label: string; total: number };

export type ServiceView = {
  id: string;
  name: string;
  kind: "recurring" | "oneoff";
  dayOfWeek: number | null;
  serviceDate: string | null;
  serviceMinutes: number;
  opensMinutes: number;
  closesMinutes: number;
  enabled: boolean;
};

const TYPE_COLORS: Record<AttendeeType, [string, string]> = {
  member: ["rgba(231,184,78,.16)", "#f0c968"],
  regular: ["rgba(121,168,238,.16)", "#9cc0f3"],
  first: ["rgba(111,207,142,.16)", "#8fdba8"],
  returning: ["rgba(184,156,240,.16)", "#c9b4f5"],
};

const card: CSSProperties = {
  background: "#121a2e",
  border: "1px solid rgba(244,241,234,.08)",
  borderRadius: "16px",
};

const anton: CSSProperties = {
  fontFamily: "var(--font-anton)",
  fontWeight: 400,
  textTransform: "uppercase",
};

const fieldLabel: CSSProperties = {
  fontSize: "13px",
  fontWeight: 800,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  color: "#aab3c5",
};

const inputStyle: CSSProperties = {
  minHeight: "48px",
  padding: "0 14px",
  borderRadius: "12px",
  border: "1.5px solid rgba(244,241,234,.18)",
  background: "#0b101c",
  color: "#f4f1ea",
  fontSize: "16px",
};

const selectStyle: CSSProperties = { ...inputStyle, fontWeight: 600 };

function typePill(t: AttendeeType): CSSProperties {
  const [bg, fg] = TYPE_COLORS[t];
  return {
    display: "inline-flex",
    padding: "5px 11px",
    borderRadius: "999px",
    background: bg,
    color: fg,
    fontSize: "13.5px",
    fontWeight: 800,
    whiteSpace: "nowrap",
  };
}

function nameButton(onClick: () => void, label: string): ReactNode {
  return (
    <button
      onClick={onClick}
      style={{
        textAlign: "left",
        background: "none",
        border: "none",
        color: "#f4f1ea",
        fontWeight: 800,
        fontSize: "16px",
        cursor: "pointer",
        padding: "4px 0",
      }}
    >
      {label}
    </button>
  );
}

export function AttendanceView({
  initialTab,
  nfcLink,
  occurrences,
  checkins,
  people,
  flags,
  guests,
  trend,
  services,
}: {
  initialTab: string;
  nfcLink: string;
  occurrences: OccurrenceView[];
  checkins: CheckinView[];
  people: Record<string, PersonView>;
  flags: FlagView[];
  guests: GuestView[];
  trend: TrendBar[];
  services: ServiceView[];
}) {
  const [tab, setTab] = useState(initialTab);
  const [narrow, setNarrow] = useState(false);
  const [personId, setPersonId] = useState<string | null>(null);

  useEffect(() => {
    const onResize = () => setNarrow(window.innerWidth < 860);
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const activeFlags = flags.filter((f) => f.status !== "resolved" && f.status !== "dismissed");
  const returnedCount = guests.filter((g) => g.returned).length;

  const tabs: { id: string; label: string; count?: number }[] = [
    { id: "overview", label: "Overview" },
    { id: "history", label: "Attendance history" },
    { id: "follow", label: "Follow-up", count: activeFlags.length },
    { id: "guests", label: "Guests" },
    { id: "services", label: "Services" },
  ];

  const openPerson = (id: string) => setPersonId(id);
  const person = personId ? people[personId] : null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "22px" }}>
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "flex-end", justifyContent: "space-between", gap: "16px" }}>
        <p style={{ color: "#9aa3b8", fontSize: "14.5px", fontWeight: 600, maxWidth: "560px", lineHeight: 1.5 }}>
          Church-wide check-ins from Tap Hub. A missing check-in does not mean someone was absent.
        </p>
        <div style={{ ...card, display: "flex", flexDirection: "column", gap: "6px", padding: "12px 16px" }}>
          <span style={{ fontSize: "12px", fontWeight: 800, letterSpacing: "0.1em", textTransform: "uppercase", color: "#aab3c5" }}>
            NFC tag / QR link
          </span>
          <div style={{ display: "flex", alignItems: "center", gap: "14px", flexWrap: "wrap" }}>
            <span style={{ fontWeight: 700, fontSize: "15px" }}>{nfcLink}</span>
            <a href="/checkin" style={{ fontWeight: 800, fontSize: "15px", color: "#e7b84e" }}>
              Open check-in →
            </a>
          </div>
        </div>
      </div>

      <div role="tablist" style={{ display: "flex", gap: "6px", flexWrap: "wrap", borderBottom: "1px solid rgba(244,241,234,.1)", paddingBottom: "12px" }}>
        {tabs.map((t) => {
          const on = tab === t.id;
          return (
            <button
              key={t.id}
              role="tab"
              aria-selected={on}
              onClick={() => setTab(t.id)}
              style={{
                minHeight: "46px",
                padding: "0 18px",
                borderRadius: "12px",
                border: "none",
                cursor: "pointer",
                fontWeight: 800,
                fontSize: "15.5px",
                display: "inline-flex",
                alignItems: "center",
                background: on ? "#e7b84e" : "transparent",
                color: on ? "#0b101c" : "#cdd3e0",
              }}
            >
              {t.label}
              {t.count ? (
                <span
                  style={{
                    marginLeft: "8px",
                    padding: "2px 8px",
                    borderRadius: "999px",
                    background: on ? "#0b101c" : "#e7b84e",
                    color: on ? "#e7b84e" : "#0b101c",
                    fontSize: "13px",
                    fontWeight: 800,
                  }}
                >
                  {t.count}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>

      {tab === "overview" && (
        <OverviewTab
          occurrences={occurrences}
          checkins={checkins}
          trend={trend}
          flagCount={activeFlags.length}
          returnedCount={returnedCount}
          guestCount={guests.length}
          goFollow={() => setTab("follow")}
          goGuests={() => setTab("guests")}
        />
      )}
      {tab === "history" && (
        <HistoryTab occurrences={occurrences} checkins={checkins} narrow={narrow} openPerson={openPerson} />
      )}
      {tab === "follow" && <FollowUpTab flags={flags} narrow={narrow} openPerson={openPerson} />}
      {tab === "guests" && <GuestsTab guests={guests} narrow={narrow} openPerson={openPerson} />}
      {tab === "services" && <ServicesTab services={services} occurrences={occurrences} />}

      {person && (
        <div
          onClick={() => setPersonId(null)}
          style={{ position: "fixed", inset: 0, background: "rgba(5,8,15,.72)", display: "flex", justifyContent: "flex-end", zIndex: 50 }}
        >
          <div
            role="dialog"
            aria-label="Attendance history"
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "min(460px, 100%)",
              height: "100%",
              overflow: "auto",
              background: "#0f1626",
              borderLeft: "1px solid rgba(244,241,234,.1)",
              padding: "28px 24px",
              display: "flex",
              flexDirection: "column",
              gap: "18px",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "12px" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                <h2 style={{ ...anton, fontSize: "30px", lineHeight: 1 }}>{person.name}</h2>
                <span>
                  <span style={typePill(person.type)}>{ATTENDEE_TYPE_LABEL[person.type]}</span>
                </span>
              </div>
              <button
                onClick={() => setPersonId(null)}
                aria-label="Close"
                style={{
                  width: "48px",
                  height: "48px",
                  borderRadius: "12px",
                  border: "1px solid rgba(244,241,234,.15)",
                  background: "#1a2438",
                  color: "#f4f1ea",
                  fontSize: "22px",
                  cursor: "pointer",
                  flexShrink: 0,
                }}
              >
                ×
              </button>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
              <div style={{ background: "#121a2e", borderRadius: "12px", padding: "14px", display: "flex", flexDirection: "column", gap: "4px" }}>
                <span style={{ color: "#aab3c5", fontSize: "13.5px", fontWeight: 700 }}>First check-in</span>
                <span style={{ fontWeight: 800 }}>{person.firstLabel}</span>
              </div>
              <div style={{ background: "#121a2e", borderRadius: "12px", padding: "14px", display: "flex", flexDirection: "column", gap: "4px" }}>
                <span style={{ color: "#aab3c5", fontSize: "13.5px", fontWeight: 700 }}>Total check-ins</span>
                <span style={{ fontWeight: 800 }}>{person.total}</span>
              </div>
            </div>
            <p style={{ color: "#cdd3e0", fontSize: "15.5px", lineHeight: 1.5 }}>
              Checked in for {person.attended} of {person.eligible} Sunday services since their first check-in.
            </p>
            {person.hasContact && (
              <p style={{ color: "#cdd3e0", fontSize: "15.5px" }}>
                Contact: <strong>{person.contactLabel}</strong>
                {person.prefLabel !== "—" ? ` · prefers ${person.prefLabel.toLowerCase()}` : ""}
              </p>
            )}
            <div style={{ display: "flex", flexDirection: "column", borderTop: "1px solid rgba(244,241,234,.08)" }}>
              {person.rows.map((r, i) => (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: "12px",
                    padding: "12px 0",
                    borderBottom: "1px solid rgba(244,241,234,.06)",
                    fontSize: "15.5px",
                  }}
                >
                  <span style={{ fontWeight: 700 }}>{r.service}</span>
                  <span style={{ color: "#aab3c5", whiteSpace: "nowrap" }}>{r.time}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function OverviewTab({
  occurrences,
  checkins,
  trend,
  flagCount,
  returnedCount,
  guestCount,
  goFollow,
  goGuests,
}: {
  occurrences: OccurrenceView[];
  checkins: CheckinView[];
  trend: TrendBar[];
  flagCount: number;
  returnedCount: number;
  guestCount: number;
  goFollow: () => void;
  goGuests: () => void;
}) {
  const withChecks = occurrences.filter((o) => o.count > 0);
  const options = withChecks.length > 0 ? withChecks : occurrences.filter((o) => o.status === "held");
  const [occKey, setOccKey] = useState(options[0]?.key ?? "");
  const selected = occurrences.find((o) => o.key === occKey) ?? options[0] ?? null;

  const sel = selected ? checkins.filter((c) => c.occKey === selected.key) : [];
  const cnt = (t: AttendeeType) => sel.filter((c) => c.type === t).length;
  const stats: { label: string; value: number; color: string }[] = [
    { label: "Total check-ins", value: sel.length, color: "#f4f1ea" },
    { label: "Members", value: cnt("member"), color: "#f0c968" },
    { label: "Regular attendees", value: cnt("regular"), color: "#9cc0f3" },
    { label: "First-time guests", value: cnt("first"), color: "#8fdba8" },
    { label: "Returning guests", value: cnt("returning"), color: "#c9b4f5" },
  ];

  const max = Math.max(1, ...trend.map((b) => b.total));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      <label style={{ display: "flex", flexDirection: "column", gap: "8px", maxWidth: "420px" }}>
        <span style={fieldLabel}>Service</span>
        <select value={selected?.key ?? ""} onChange={(e) => setOccKey(e.target.value)} style={selectStyle}>
          {options.map((o) => (
            <option key={o.key} value={o.key}>
              {o.serviceName} · {o.dateLabel}
            </option>
          ))}
        </select>
      </label>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(150px, 100%), 1fr))", gap: "12px" }}>
        {stats.map((s) => (
          <div key={s.label} style={{ ...card, padding: "18px 18px 16px", display: "flex", flexDirection: "column", gap: "6px" }}>
            <span style={{ fontSize: "14px", fontWeight: 700, color: "#aab3c5" }}>{s.label}</span>
            <span style={{ ...anton, fontSize: "40px", lineHeight: 1, color: s.color }}>{s.value}</span>
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(320px, 100%), 1fr))", gap: "16px" }}>
        <div style={{ ...card, padding: "22px", display: "flex", flexDirection: "column", gap: "18px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: "12px", flexWrap: "wrap" }}>
            <h2 style={{ ...anton, fontSize: "22px" }}>Sunday check-ins</h2>
            <span style={{ color: "#aab3c5", fontSize: "14px", fontWeight: 600 }}>Last {trend.length} Sundays</span>
          </div>
          {trend.length === 0 ? (
            <p style={{ color: "#aab3c5", fontSize: "15px" }}>No Sunday check-ins yet.</p>
          ) : (
            <div style={{ display: "flex", alignItems: "flex-end", gap: "6px", height: "210px" }}>
              {trend.map((b) => (
                <div key={b.date} style={{ flex: 1, minWidth: 0, height: "100%", display: "flex", flexDirection: "column", justifyContent: "flex-end", alignItems: "center", gap: "6px" }}>
                  <span style={{ fontWeight: 800, fontSize: "15px" }}>{b.total}</span>
                  <div
                    style={{
                      width: "100%",
                      maxWidth: "44px",
                      height: `${Math.max(4, Math.round((b.total / max) * 140))}px`,
                      borderRadius: "8px 8px 3px 3px",
                      background: selected && b.date === selected.date ? "#e7b84e" : "rgba(231,184,78,.4)",
                    }}
                  />
                  <span style={{ fontSize: "12px", fontWeight: 700, color: "#aab3c5", textAlign: "center", lineHeight: 1.2 }}>{b.label}</span>
                </div>
              ))}
            </div>
          )}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <button
            onClick={goFollow}
            style={{ ...card, textAlign: "left", border: "1px solid rgba(231,184,78,.35)", padding: "22px", cursor: "pointer", color: "#f4f1ea", display: "flex", flexDirection: "column", gap: "8px" }}
          >
            <span style={{ fontSize: "14px", fontWeight: 700, color: "#e7b84e" }}>Follow-up candidates</span>
            <span style={{ ...anton, fontSize: "40px", lineHeight: 1 }}>{flagCount}</span>
            <span style={{ color: "#aab3c5", fontSize: "15px", lineHeight: 1.45 }}>
              Members with no check-in for 3 or more Sundays in a row. Review →
            </span>
          </button>
          <button
            onClick={goGuests}
            style={{ ...card, textAlign: "left", padding: "22px", cursor: "pointer", color: "#f4f1ea", display: "flex", flexDirection: "column", gap: "8px" }}
          >
            <span style={{ fontSize: "14px", fontWeight: 700, color: "#b89cf0" }}>Guests who came back</span>
            <span style={{ ...anton, fontSize: "40px", lineHeight: 1 }}>{returnedCount}</span>
            <span style={{ color: "#aab3c5", fontSize: "15px", lineHeight: 1.45 }}>
              of {guestCount} guests have checked in more than once. View guests →
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}

function HistoryTab({
  occurrences,
  checkins,
  narrow,
  openPerson,
}: {
  occurrences: OccurrenceView[];
  checkins: CheckinView[];
  narrow: boolean;
  openPerson: (id: string) => void;
}) {
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("All");
  const [occ, setOcc] = useState("All");

  const withChecks = occurrences.filter((o) => o.count > 0);
  const query = q.trim().toLowerCase();
  const hits = checkins.filter(
    (c) =>
      (cat === "All" || c.type === cat) &&
      (occ === "All" || c.occKey === occ) &&
      (!query || c.name.toLowerCase().includes(query)),
  );
  const rows = hits.slice(0, 80);
  const summary =
    hits.length > 80 ? `Showing the 80 most recent of ${hits.length} check-ins` : `${hits.length} check-ins`;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(220px, 100%), 1fr))", gap: "12px" }}>
        <label style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          <span style={fieldLabel}>Search name</span>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="e.g. Brooks" style={inputStyle} />
        </label>
        <label style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          <span style={fieldLabel}>Category</span>
          <select value={cat} onChange={(e) => setCat(e.target.value)} style={selectStyle}>
            <option value="All">All categories</option>
            {(Object.keys(ATTENDEE_TYPE_LABEL) as AttendeeType[]).map((t) => (
              <option key={t} value={t}>
                {ATTENDEE_TYPE_LABEL[t]}
              </option>
            ))}
          </select>
        </label>
        <label style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          <span style={fieldLabel}>Service / date</span>
          <select value={occ} onChange={(e) => setOcc(e.target.value)} style={selectStyle}>
            <option value="All">All services</option>
            {withChecks.map((o) => (
              <option key={o.key} value={o.key}>
                {o.serviceName} · {o.dateLabel}
              </option>
            ))}
          </select>
        </label>
      </div>
      <span style={{ color: "#aab3c5", fontSize: "15px", fontWeight: 600 }}>{summary}</span>

      {narrow ? (
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {rows.map((c) => (
            <div key={c.id} style={{ ...card, borderRadius: "14px", padding: "16px", display: "flex", flexDirection: "column", gap: "8px" }}>
              {nameButton(() => openPerson(c.attendeeId), c.name)}
              <span>
                <span style={typePill(c.type)}>{ATTENDEE_TYPE_LABEL[c.type]}</span>
              </span>
              <span style={{ fontSize: "15.5px", color: "#cdd3e0" }}>
                {c.serviceLabel} · {c.timeLabel}
              </span>
            </div>
          ))}
          {rows.length === 0 && <Empty>No check-ins match these filters.</Empty>}
        </div>
      ) : (
        <div style={{ overflowX: "auto", border: "1px solid rgba(244,241,234,.08)", borderRadius: "16px", background: "#121a2e" }}>
          <div style={{ minWidth: "760px" }}>
            <GridHeader cols="minmax(180px, 2fr) 190px minmax(200px, 1.6fr) 120px" labels={["Name", "Category", "Service", "Time"]} />
            {rows.map((c) => (
              <div
                key={c.id}
                style={{
                  display: "grid",
                  gridTemplateColumns: "minmax(180px, 2fr) 190px minmax(200px, 1.6fr) 120px",
                  gap: "12px",
                  padding: "12px 20px",
                  alignItems: "center",
                  borderBottom: "1px solid rgba(244,241,234,.06)",
                  minHeight: "56px",
                }}
              >
                {nameButton(() => openPerson(c.attendeeId), c.name)}
                <span>
                  <span style={typePill(c.type)}>{ATTENDEE_TYPE_LABEL[c.type]}</span>
                </span>
                <span style={{ fontSize: "15px", color: "#cdd3e0" }}>{c.serviceLabel}</span>
                <span style={{ fontSize: "15px", color: "#cdd3e0" }}>{c.timeLabel}</span>
              </div>
            ))}
            {rows.length === 0 && <Empty>No check-ins match these filters.</Empty>}
          </div>
        </div>
      )}
    </div>
  );
}

function FollowUpTab({
  flags,
  narrow,
  openPerson,
}: {
  flags: FlagView[];
  narrow: boolean;
  openPerson: (id: string) => void;
}) {
  const [showDismissed, setShowDismissed] = useState(false);
  const [statusOverride, setStatusOverride] = useState<Record<string, FollowUpStatus>>({});
  const [err, setErr] = useState("");

  const statusOf = (f: FlagView) => statusOverride[f.attendeeId] ?? f.status;
  const hidden = (s: FollowUpStatus) => s === "resolved" || s === "dismissed";
  const shown = flags.filter((f) => showDismissed || !hidden(statusOf(f)));

  async function changeStatus(attendeeId: string, status: FollowUpStatus) {
    setErr("");
    setStatusOverride((m) => ({ ...m, [attendeeId]: status }));
    const result = await setFollowUpStatus(attendeeId, status);
    if (!result.ok) {
      setStatusOverride((m) => {
        const next = { ...m };
        delete next[attendeeId];
        return next;
      });
      setErr(result.error);
    }
  }

  const statusSelect = (f: FlagView) => (
    <select
      value={statusOf(f)}
      onChange={(e) => changeStatus(f.attendeeId, e.target.value as FollowUpStatus)}
      aria-label="Follow-up status"
      style={{ ...selectStyle, minHeight: "46px", fontSize: "15.5px", fontWeight: 700 }}
    >
      {(Object.keys(FOLLOW_UP_LABEL) as FollowUpStatus[]).map((s) => (
        <option key={s} value={s}>
          {FOLLOW_UP_LABEL[s]}
        </option>
      ))}
    </select>
  );

  const dismissButton = (f: FlagView) => (
    <button
      onClick={() => changeStatus(f.attendeeId, "dismissed")}
      style={{
        minHeight: "46px",
        borderRadius: "10px",
        border: "1.5px solid rgba(244,241,234,.2)",
        background: "transparent",
        color: "#cdd3e0",
        fontWeight: 700,
        fontSize: "15px",
        cursor: "pointer",
      }}
    >
      Dismiss flag
    </button>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      <div
        style={{
          padding: "16px 18px",
          background: "rgba(231,184,78,.1)",
          border: "1px solid rgba(231,184,78,.3)",
          borderRadius: "14px",
          fontSize: "15.5px",
          lineHeight: 1.55,
          color: "#f4f1ea",
        }}
      >
        These are members with no recorded check-in for 3 or more Sunday services in a row. They are{" "}
        <strong>possible</strong>{" "}follow-ups, not confirmed absences. Only Sundays that took place after a
        member&apos;s first check-in are counted. Nobody is contacted automatically.
      </div>
      <label style={{ display: "flex", alignItems: "center", gap: "10px", fontWeight: 700, fontSize: "15.5px", cursor: "pointer", minHeight: "44px" }}>
        <input
          type="checkbox"
          checked={showDismissed}
          onChange={(e) => setShowDismissed(e.target.checked)}
          style={{ width: "22px", height: "22px", accentColor: "#e7b84e" }}
        />
        Show resolved and dismissed
      </label>
      {err && (
        <p role="alert" style={{ color: "#ff9d8a", fontWeight: 700, fontSize: "15px" }}>
          {err}
        </p>
      )}

      {narrow ? (
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {shown.map((f) => (
            <div key={f.attendeeId} style={{ ...card, borderRadius: "14px", padding: "16px", display: "flex", flexDirection: "column", gap: "10px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "10px" }}>
                {nameButton(() => openPerson(f.attendeeId), f.name)}
                <span style={{ ...anton, fontSize: "20px", color: "#e7b84e", whiteSpace: "nowrap" }}>{f.miss} missed</span>
              </div>
              <span style={{ fontSize: "15.5px", color: "#cdd3e0" }}>Last check-in: {f.lastLabel}</span>
              {statusSelect(f)}
              {dismissButton(f)}
            </div>
          ))}
          {shown.length === 0 && <Empty>No follow-up candidates right now.</Empty>}
        </div>
      ) : (
        <div style={{ overflowX: "auto", border: "1px solid rgba(244,241,234,.08)", borderRadius: "16px", background: "#121a2e" }}>
          <div style={{ minWidth: "860px" }}>
            <GridHeader
              cols="minmax(180px, 1.6fr) minmax(200px, 1.4fr) 150px 210px 150px"
              labels={["Member", "Last check-in", "Sundays missed", "Status", ""]}
            />
            {shown.map((f) => (
              <div
                key={f.attendeeId}
                style={{
                  display: "grid",
                  gridTemplateColumns: "minmax(180px, 1.6fr) minmax(200px, 1.4fr) 150px 210px 150px",
                  gap: "12px",
                  padding: "12px 20px",
                  alignItems: "center",
                  borderBottom: "1px solid rgba(244,241,234,.06)",
                  minHeight: "64px",
                }}
              >
                {nameButton(() => openPerson(f.attendeeId), f.name)}
                <span style={{ fontSize: "15px", color: "#cdd3e0" }}>{f.lastLabel}</span>
                <span style={{ ...anton, fontSize: "24px", color: "#e7b84e" }}>{f.miss} in a row</span>
                {statusSelect(f)}
                {dismissButton(f)}
              </div>
            ))}
            {shown.length === 0 && <Empty>No follow-up candidates right now.</Empty>}
          </div>
        </div>
      )}
    </div>
  );
}

function GuestsTab({
  guests,
  narrow,
  openPerson,
}: {
  guests: GuestView[];
  narrow: boolean;
  openPerson: (id: string) => void;
}) {
  const [returnedOnly, setReturnedOnly] = useState(false);
  const shown = guests.filter((g) => !returnedOnly || g.returned);

  const cameBack = (
    <span
      style={{
        display: "inline-flex",
        padding: "5px 10px",
        borderRadius: "999px",
        background: "rgba(184,156,240,.16)",
        color: "#c9b4f5",
        fontSize: "13px",
        fontWeight: 800,
        whiteSpace: "nowrap",
      }}
    >
      Came back
    </span>
  );

  const contactStyle = (g: GuestView): CSSProperties => ({
    fontSize: "15px",
    color: g.hasContact ? "#f4f1ea" : "#8a93a8",
    fontWeight: g.hasContact ? 700 : 500,
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "12px", alignItems: "center", justifyContent: "space-between" }}>
        <label style={{ display: "flex", alignItems: "center", gap: "10px", fontWeight: 700, fontSize: "15.5px", cursor: "pointer", minHeight: "44px" }}>
          <input
            type="checkbox"
            checked={returnedOnly}
            onChange={(e) => setReturnedOnly(e.target.checked)}
            style={{ width: "22px", height: "22px", accentColor: "#e7b84e" }}
          />
          Only guests who came back
        </label>
        <span style={{ color: "#aab3c5", fontSize: "14.5px" }}>
          Contact details only appear when the guest agreed to be contacted.
        </span>
      </div>

      {narrow ? (
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {shown.map((g) => (
            <div key={g.attendeeId} style={{ ...card, borderRadius: "14px", padding: "16px", display: "flex", flexDirection: "column", gap: "8px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "10px" }}>
                {nameButton(() => openPerson(g.attendeeId), g.name)}
                {g.returned && cameBack}
              </div>
              <span style={contactStyle(g)}>{g.contact}</span>
              <span style={{ fontSize: "15px", color: "#cdd3e0" }}>
                Prefers: {g.pref} · {g.visits} visits
              </span>
              <span style={{ fontSize: "15px", color: "#aab3c5" }}>
                First {g.firstLabel} · Last {g.lastLabel}
              </span>
            </div>
          ))}
          {shown.length === 0 && <Empty>No guests to show.</Empty>}
        </div>
      ) : (
        <div style={{ overflowX: "auto", border: "1px solid rgba(244,241,234,.08)", borderRadius: "16px", background: "#121a2e" }}>
          <div style={{ minWidth: "940px" }}>
            <GridHeader
              cols="minmax(170px, 1.4fr) minmax(200px, 1.6fr) 110px 130px 130px 80px 110px"
              labels={["Guest", "Contact", "Prefers", "First visit", "Last visit", "Visits", ""]}
            />
            {shown.map((g) => (
              <div
                key={g.attendeeId}
                style={{
                  display: "grid",
                  gridTemplateColumns: "minmax(170px, 1.4fr) minmax(200px, 1.6fr) 110px 130px 130px 80px 110px",
                  gap: "12px",
                  padding: "12px 20px",
                  alignItems: "center",
                  borderBottom: "1px solid rgba(244,241,234,.06)",
                  minHeight: "60px",
                }}
              >
                {nameButton(() => openPerson(g.attendeeId), g.name)}
                <span style={contactStyle(g)}>{g.contact}</span>
                <span style={{ fontSize: "15px", color: "#cdd3e0" }}>{g.pref}</span>
                <span style={{ fontSize: "15px", color: "#cdd3e0" }}>{g.firstLabel}</span>
                <span style={{ fontSize: "15px", color: "#cdd3e0" }}>{g.lastLabel}</span>
                <span style={{ ...anton, fontSize: "22px" }}>{g.visits}</span>
                <span>{g.returned && cameBack}</span>
              </div>
            ))}
            {shown.length === 0 && <Empty>No guests to show.</Empty>}
          </div>
        </div>
      )}
    </div>
  );
}

function minutesToInput(mins: number): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(Math.floor(mins / 60))}:${pad(mins % 60)}`;
}

function inputToMinutes(value: string): number | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(value);
  if (!m) return null;
  const mins = Number(m[1]) * 60 + Number(m[2]);
  return mins >= 0 && mins <= 1439 ? mins : null;
}

function ServicesTab({
  services,
  occurrences,
}: {
  services: ServiceView[];
  occurrences: OccurrenceView[];
}) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function run(action: () => Promise<{ ok: boolean; error?: string }>) {
    setErr("");
    setBusy(true);
    const result = await action();
    setBusy(false);
    if (!result.ok) setErr(result.error ?? "Something went wrong.");
    return result.ok;
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      {err && (
        <p role="alert" style={{ color: "#ff9d8a", fontWeight: 700, fontSize: "15px" }}>
          {err}
        </p>
      )}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(340px, 100%), 1fr))", gap: "20px", alignItems: "start" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          <RecurringConfig services={services.filter((s) => s.kind === "recurring")} busy={busy} run={run} />
          <AddOneOff busy={busy} run={run} />
        </div>
        <OccurrenceList occurrences={occurrences} services={services} busy={busy} run={run} />
      </div>
    </div>
  );
}

function RecurringConfig({
  services,
  busy,
  run,
}: {
  services: ServiceView[];
  busy: boolean;
  run: (action: () => Promise<{ ok: boolean; error?: string }>) => Promise<boolean>;
}) {
  return (
    <div style={{ ...card, padding: "22px", display: "flex", flexDirection: "column", gap: "18px" }}>
      <h2 style={{ ...anton, fontSize: "22px" }}>Check-in windows</h2>
      <p style={{ color: "#aab3c5", fontSize: "15px", lineHeight: 1.5 }}>
        Set which days and times check-in is open for the standing services. People can only check in
        between the open and close times.
      </p>
      {services.map((s) => (
        <RecurringRow key={s.id} service={s} busy={busy} run={run} />
      ))}
    </div>
  );
}

function RecurringRow({
  service,
  busy,
  run,
}: {
  service: ServiceView;
  busy: boolean;
  run: (action: () => Promise<{ ok: boolean; error?: string }>) => Promise<boolean>;
}) {
  const [dow, setDow] = useState(service.dayOfWeek ?? 0);
  const [time, setTime] = useState(minutesToInput(service.serviceMinutes));
  const [opens, setOpens] = useState(minutesToInput(service.opensMinutes));
  const [closes, setCloses] = useState(minutesToInput(service.closesMinutes));
  const [enabled, setEnabled] = useState(service.enabled);
  const [saved, setSaved] = useState(false);

  const dirty =
    dow !== (service.dayOfWeek ?? 0) ||
    time !== minutesToInput(service.serviceMinutes) ||
    opens !== minutesToInput(service.opensMinutes) ||
    closes !== minutesToInput(service.closesMinutes) ||
    enabled !== service.enabled;

  async function save() {
    const serviceMinutes = inputToMinutes(time);
    const opensMinutes = inputToMinutes(opens);
    const closesMinutes = inputToMinutes(closes);
    if (serviceMinutes == null || opensMinutes == null || closesMinutes == null) return;
    setSaved(false);
    const ok = await run(() =>
      updateRecurringService(service.id, { dayOfWeek: dow, serviceMinutes, opensMinutes, closesMinutes, enabled }),
    );
    if (ok) setSaved(true);
  }

  const timeField = (label: string, value: string, set: (v: string) => void) => (
    <label style={{ display: "flex", flexDirection: "column", gap: "6px", flex: 1, minWidth: "104px" }}>
      <span style={{ ...fieldLabel, fontSize: "12px" }}>{label}</span>
      <input type="time" value={value} onChange={(e) => set(e.target.value)} style={{ ...inputStyle, minHeight: "46px", padding: "0 10px" }} />
    </label>
  );

  return (
    <div style={{ border: "1px solid rgba(244,241,234,.1)", borderRadius: "13px", padding: "16px", display: "flex", flexDirection: "column", gap: "12px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
        <span style={{ fontWeight: 800, fontSize: "16.5px" }}>{service.name}</span>
        <label style={{ display: "flex", alignItems: "center", gap: "8px", fontWeight: 700, fontSize: "14.5px", cursor: "pointer" }}>
          <input
            type="checkbox"
            checked={enabled}
            onChange={(e) => setEnabled(e.target.checked)}
            style={{ width: "20px", height: "20px", accentColor: "#e7b84e" }}
          />
          Check-in enabled
        </label>
      </div>
      <label style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
        <span style={{ ...fieldLabel, fontSize: "12px" }}>Day of week</span>
        <select value={dow} onChange={(e) => setDow(Number(e.target.value))} style={{ ...selectStyle, minHeight: "46px" }}>
          {DOW_LABEL.map((label, i) => (
            <option key={label} value={i}>
              {label}
            </option>
          ))}
        </select>
      </label>
      <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
        {timeField("Service time", time, setTime)}
        {timeField("Check-in opens", opens, setOpens)}
        {timeField("Check-in closes", closes, setCloses)}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
        <button
          onClick={save}
          disabled={busy || !dirty}
          style={{
            minHeight: "46px",
            padding: "0 18px",
            borderRadius: "11px",
            border: "none",
            background: dirty ? "#e7b84e" : "rgba(231,184,78,.25)",
            color: "#0b101c",
            fontWeight: 800,
            fontSize: "15px",
            cursor: dirty ? "pointer" : "default",
          }}
        >
          Save window
        </button>
        {saved && !dirty && <span style={{ color: "#8fdba8", fontWeight: 700, fontSize: "14.5px" }}>Saved</span>}
      </div>
    </div>
  );
}

function AddOneOff({
  busy,
  run,
}: {
  busy: boolean;
  run: (action: () => Promise<{ ok: boolean; error?: string }>) => Promise<boolean>;
}) {
  const [name, setName] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("18:00");
  const [opens, setOpens] = useState("17:30");
  const [closes, setCloses] = useState("21:00");
  const [localErr, setLocalErr] = useState("");

  async function add() {
    const serviceMinutes = inputToMinutes(time);
    const opensMinutes = inputToMinutes(opens);
    const closesMinutes = inputToMinutes(closes);
    if (!name.trim() || !date) {
      setLocalErr("Add a name and a date.");
      return;
    }
    if (serviceMinutes == null || opensMinutes == null || closesMinutes == null) {
      setLocalErr("Add the service time and the check-in window.");
      return;
    }
    setLocalErr("");
    const ok = await run(() => addOneOffService({ name, dateIso: date, serviceMinutes, opensMinutes, closesMinutes }));
    if (ok) {
      setName("");
      setDate("");
    }
  }

  const timeField = (label: string, value: string, set: (v: string) => void) => (
    <label style={{ display: "flex", flexDirection: "column", gap: "6px", flex: 1, minWidth: "104px" }}>
      <span style={{ ...fieldLabel, fontSize: "12px" }}>{label}</span>
      <input type="time" value={value} onChange={(e) => set(e.target.value)} style={{ ...inputStyle, minHeight: "46px", padding: "0 10px" }} />
    </label>
  );

  return (
    <div style={{ ...card, padding: "22px", display: "flex", flexDirection: "column", gap: "14px" }}>
      <h2 style={{ ...anton, fontSize: "22px" }}>Add a service</h2>
      <p style={{ color: "#aab3c5", fontSize: "15px", lineHeight: 1.5 }}>
        The standing services above are added automatically. Add revivals, special services, or events
        that need check-in.
      </p>
      <label style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
        <span style={fieldLabel}>Name</span>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Fall Revival Night 1" style={inputStyle} />
      </label>
      <label style={{ display: "flex", flexDirection: "column", gap: "8px", maxWidth: "220px" }}>
        <span style={fieldLabel}>Date</span>
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} style={{ ...inputStyle, padding: "0 12px" }} />
      </label>
      <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
        {timeField("Service time", time, setTime)}
        {timeField("Check-in opens", opens, setOpens)}
        {timeField("Check-in closes", closes, setCloses)}
      </div>
      {localErr && (
        <span role="alert" style={{ color: "#ff9d8a", fontWeight: 700, fontSize: "15px" }}>
          {localErr}
        </span>
      )}
      <button
        onClick={add}
        disabled={busy}
        style={{
          minHeight: "52px",
          borderRadius: "12px",
          border: "none",
          background: "#e7b84e",
          color: "#0b101c",
          fontWeight: 800,
          fontSize: "16px",
          cursor: "pointer",
        }}
      >
        Add service
      </button>
    </div>
  );
}

function OccurrenceList({
  occurrences,
  services,
  busy,
  run,
}: {
  occurrences: OccurrenceView[];
  services: ServiceView[];
  busy: boolean;
  run: (action: () => Promise<{ ok: boolean; error?: string }>) => Promise<boolean>;
}) {
  const oneoffById = new Map(services.filter((s) => s.kind === "oneoff").map((s) => [s.id, s]));

  const pill = (o: OccurrenceView): { label: string; style: CSSProperties } => {
    const [bg, fg] =
      o.status === "upcoming"
        ? ["rgba(121,168,238,.16)", "#9cc0f3"]
        : o.status === "held"
          ? ["rgba(111,207,142,.16)", "#8fdba8"]
          : ["rgba(255,157,138,.14)", "#ff9d8a"];
    return {
      label: o.status === "upcoming" ? "Upcoming" : o.status === "held" ? "Held" : "Did not occur",
      style: {
        padding: "6px 12px",
        borderRadius: "999px",
        background: bg,
        color: fg,
        fontSize: "13.5px",
        fontWeight: 800,
        whiteSpace: "nowrap",
      },
    };
  };

  return (
    <div style={{ ...card, overflow: "hidden" }}>
      {occurrences.map((o) => {
        const p = pill(o);
        const oneoff = o.kind === "oneoff" ? oneoffById.get(o.serviceId) : undefined;
        return (
          <div
            key={o.key}
            style={{
              display: "flex",
              flexWrap: "wrap",
              alignItems: "center",
              gap: "12px",
              padding: "14px 20px",
              borderBottom: "1px solid rgba(244,241,234,.06)",
              minHeight: "68px",
            }}
          >
            <div style={{ flex: 1, minWidth: "200px", display: "flex", flexDirection: "column", gap: "3px" }}>
              <span style={{ fontWeight: 800, fontSize: "16px" }}>{o.serviceName}</span>
              <span style={{ color: "#aab3c5", fontSize: "14.5px" }}>
                {o.dateLabel} · {o.timeLabel} · {o.count} check-ins
              </span>
            </div>
            <span style={p.style}>{p.label}</span>
            {o.status !== "upcoming" && (
              <button
                onClick={() => run(() => setOccurrenceDidNotOccur(o.serviceId, o.date, o.status !== "skipped"))}
                disabled={busy}
                style={{
                  minHeight: "44px",
                  padding: "0 14px",
                  borderRadius: "10px",
                  border: "1.5px solid rgba(244,241,234,.2)",
                  background: "transparent",
                  color: "#cdd3e0",
                  fontWeight: 700,
                  fontSize: "14.5px",
                  cursor: "pointer",
                }}
              >
                {o.status === "skipped" ? "Mark as held" : "Mark as did not occur"}
              </button>
            )}
            {oneoff && o.count === 0 && (
              <button
                onClick={() => run(() => deleteOneOffService(oneoff.id))}
                disabled={busy}
                style={{
                  minHeight: "44px",
                  padding: "0 14px",
                  borderRadius: "10px",
                  border: "1.5px solid rgba(255,157,138,.35)",
                  background: "transparent",
                  color: "#ff9d8a",
                  fontWeight: 700,
                  fontSize: "14.5px",
                  cursor: "pointer",
                }}
              >
                Remove
              </button>
            )}
          </div>
        );
      })}
      {occurrences.length === 0 && <Empty>No services yet.</Empty>}
    </div>
  );
}

function GridHeader({ cols, labels }: { cols: string; labels: string[] }) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: cols,
        gap: "12px",
        padding: "14px 20px",
        fontSize: "13px",
        fontWeight: 800,
        letterSpacing: "0.08em",
        textTransform: "uppercase",
        color: "#aab3c5",
        borderBottom: "1px solid rgba(244,241,234,.08)",
      }}
    >
      {labels.map((l, i) => (
        <span key={i}>{l}</span>
      ))}
    </div>
  );
}

function Empty({ children }: { children: ReactNode }) {
  return <div style={{ padding: "28px 20px", color: "#aab3c5", textAlign: "center" }}>{children}</div>;
}
