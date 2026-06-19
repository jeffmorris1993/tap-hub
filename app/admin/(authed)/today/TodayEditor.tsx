"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  saveWeekItem,
  deleteWeekItem,
  saveEvening,
  deleteEvening,
  type WeekItemInput,
  type EveningInput,
} from "./actions";

type WeekRow = { id: string; day_label: string; title: string; detail: string; sort_order: number };
type EveningRow = {
  id: string;
  label: string;
  location: string;
  starts_at_minutes: number;
  active_from: string | null;
  active_until: string | null;
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "10px 12px",
  border: "1.5px solid rgba(244,241,234,.14)",
  borderRadius: "9px",
  fontSize: "14px",
  color: "#f4f1ea",
  background: "#0b101c",
  outline: "none",
};

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: "10.5px",
  fontWeight: 800,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  color: "#9aa3b8",
  marginBottom: "5px",
};

function minutesToTime(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
}

export function TodayEditor({ week, evenings }: { week: WeekRow[]; evenings: EveningRow[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function refresh() {
    router.refresh();
  }

  return (
    <div>
      <h1
        style={{
          fontFamily: "var(--font-anton)",
          fontWeight: 400,
          textTransform: "uppercase",
          fontSize: "32px",
          lineHeight: 1,
          marginBottom: "6px",
        }}
      >
        Today &amp; This Week
      </h1>
      <p style={{ color: "#9aa3b8", fontSize: "14px", marginBottom: "32px" }}>
        Sunday&apos;s recurring schedule is fixed (Prayer 10am · Christian Ed 10:30 · Fellowship 11:30 · Worship
        12pm). Use this page to manage what shows up under &ldquo;Coming Up This Week&rdquo; and any one-off
        evening or special services.
      </p>

      <section style={{ marginBottom: "44px" }}>
        <h2
          style={{
            fontFamily: "var(--font-anton)",
            fontWeight: 400,
            textTransform: "uppercase",
            fontSize: "22px",
            marginBottom: "14px",
          }}
        >
          Coming Up This Week
        </h2>
        <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "14px" }}>
          {week.length === 0 && (
            <div style={{ color: "#9aa3b8", fontSize: "13.5px" }}>No upcoming items.</div>
          )}
          {week.map((w) => (
            <WeekRowEditor
              key={w.id}
              row={w}
              onSave={(input) =>
                startTransition(async () => {
                  await saveWeekItem(input);
                  refresh();
                })
              }
              onDelete={() =>
                startTransition(async () => {
                  await deleteWeekItem(w.id);
                  refresh();
                })
              }
              pending={pending}
            />
          ))}
        </div>
        <WeekRowEditor
          key="new"
          newRow
          onSave={(input) =>
            startTransition(async () => {
              await saveWeekItem(input);
              refresh();
            })
          }
          pending={pending}
        />
      </section>

      <section>
        <h2
          style={{
            fontFamily: "var(--font-anton)",
            fontWeight: 400,
            textTransform: "uppercase",
            fontSize: "22px",
            marginBottom: "14px",
          }}
        >
          One-off Evening / Special Service
        </h2>
        <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "14px" }}>
          {evenings.length === 0 && (
            <div style={{ color: "#9aa3b8", fontSize: "13.5px" }}>No evening services scheduled.</div>
          )}
          {evenings.map((ev) => (
            <EveningRowEditor
              key={ev.id}
              row={ev}
              onSave={(input) =>
                startTransition(async () => {
                  await saveEvening(input);
                  refresh();
                })
              }
              onDelete={() =>
                startTransition(async () => {
                  await deleteEvening(ev.id);
                  refresh();
                })
              }
              pending={pending}
            />
          ))}
        </div>
        <EveningRowEditor
          newRow
          onSave={(input) =>
            startTransition(async () => {
              await saveEvening(input);
              refresh();
            })
          }
          pending={pending}
        />
      </section>
    </div>
  );
}

function WeekRowEditor({
  row,
  newRow,
  onSave,
  onDelete,
  pending,
}: {
  row?: WeekRow;
  newRow?: boolean;
  onSave: (input: WeekItemInput) => void;
  onDelete?: () => void;
  pending: boolean;
}) {
  const [day, setDay] = useState(row?.day_label ?? "");
  const [title, setTitle] = useState(row?.title ?? "");
  const [detail, setDetail] = useState(row?.detail ?? "");
  const [sortOrder, setSortOrder] = useState(row?.sort_order ?? 0);
  const [err, setErr] = useState<string | null>(null);

  function submit() {
    setErr(null);
    if (!day.trim() || !title.trim()) {
      setErr("Day and title required.");
      return;
    }
    onSave({ id: row?.id, day_label: day, title, detail, sort_order: sortOrder });
    if (newRow) {
      setDay("");
      setTitle("");
      setDetail("");
      setSortOrder(0);
    }
  }

  return (
    <div
      style={{
        background: newRow ? "rgba(231,184,78,.06)" : "#121a2e",
        border: `1px solid ${newRow ? "rgba(231,184,78,.25)" : "rgba(244,241,234,.08)"}`,
        borderRadius: "12px",
        padding: "14px",
        display: "grid",
        gridTemplateColumns: "70px 1fr 1fr 70px auto",
        gap: "10px",
        alignItems: "end",
      }}
    >
      <div>
        <label style={labelStyle}>Day</label>
        <input value={day} onChange={(e) => setDay(e.target.value)} placeholder="Wed" style={inputStyle} />
      </div>
      <div>
        <label style={labelStyle}>Title</label>
        <input value={title} onChange={(e) => setTitle(e.target.value)} style={inputStyle} />
      </div>
      <div>
        <label style={labelStyle}>Detail</label>
        <input value={detail} onChange={(e) => setDetail(e.target.value)} style={inputStyle} />
      </div>
      <div>
        <label style={labelStyle}>Order</label>
        <input
          type="number"
          value={sortOrder}
          onChange={(e) => setSortOrder(parseInt(e.target.value || "0", 10))}
          style={inputStyle}
        />
      </div>
      <div style={{ display: "flex", gap: "8px", paddingBottom: "1px" }}>
        <button
          type="button"
          onClick={submit}
          disabled={pending}
          style={{
            background: newRow ? "#e7b84e" : "#1a2438",
            color: newRow ? "#0b101c" : "#cdd3e0",
            fontWeight: 800,
            fontSize: "11.5px",
            letterSpacing: "0.05em",
            textTransform: "uppercase",
            padding: "10px 14px",
            borderRadius: "8px",
            border: newRow ? "none" : "1px solid rgba(244,241,234,.14)",
            cursor: "pointer",
          }}
        >
          {newRow ? "Add" : "Save"}
        </button>
        {onDelete && (
          <button
            type="button"
            onClick={onDelete}
            disabled={pending}
            style={{
              background: "transparent",
              color: "#ff8a8a",
              fontWeight: 800,
              fontSize: "11.5px",
              padding: "10px 12px",
              borderRadius: "8px",
              border: "1px solid rgba(255,138,138,.3)",
              cursor: "pointer",
            }}
          >
            ×
          </button>
        )}
      </div>
      {err && (
        <div style={{ gridColumn: "1 / -1", color: "#ff8a8a", fontSize: "12.5px", fontWeight: 700 }}>{err}</div>
      )}
    </div>
  );
}

function EveningRowEditor({
  row,
  newRow,
  onSave,
  onDelete,
  pending,
}: {
  row?: EveningRow;
  newRow?: boolean;
  onSave: (input: EveningInput) => void;
  onDelete?: () => void;
  pending: boolean;
}) {
  const [date, setDate] = useState(row?.active_from ?? "");
  const [time, setTime] = useState(row ? minutesToTime(row.starts_at_minutes) : "18:00");
  const [label, setLabel] = useState(row?.label ?? "Evening Worship");
  const [location, setLocation] = useState(row?.location ?? "Main Sanctuary");
  const [err, setErr] = useState<string | null>(null);

  function submit() {
    setErr(null);
    if (!date) {
      setErr("Date required.");
      return;
    }
    onSave({ id: row?.id, date, time, label, location });
    if (newRow) {
      setDate("");
      setLabel("Evening Worship");
      setLocation("Main Sanctuary");
      setTime("18:00");
    }
  }

  return (
    <div
      style={{
        background: newRow ? "rgba(231,184,78,.06)" : "#121a2e",
        border: `1px solid ${newRow ? "rgba(231,184,78,.25)" : "rgba(244,241,234,.08)"}`,
        borderRadius: "12px",
        padding: "14px",
        display: "grid",
        gridTemplateColumns: "150px 110px 1fr 1fr auto",
        gap: "10px",
        alignItems: "end",
      }}
    >
      <div>
        <label style={labelStyle}>Date</label>
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} style={inputStyle} />
      </div>
      <div>
        <label style={labelStyle}>Time</label>
        <input type="time" value={time} onChange={(e) => setTime(e.target.value)} style={inputStyle} />
      </div>
      <div>
        <label style={labelStyle}>Label</label>
        <input value={label} onChange={(e) => setLabel(e.target.value)} style={inputStyle} />
      </div>
      <div>
        <label style={labelStyle}>Location</label>
        <input value={location} onChange={(e) => setLocation(e.target.value)} style={inputStyle} />
      </div>
      <div style={{ display: "flex", gap: "8px", paddingBottom: "1px" }}>
        <button
          type="button"
          onClick={submit}
          disabled={pending}
          style={{
            background: newRow ? "#e7b84e" : "#1a2438",
            color: newRow ? "#0b101c" : "#cdd3e0",
            fontWeight: 800,
            fontSize: "11.5px",
            letterSpacing: "0.05em",
            textTransform: "uppercase",
            padding: "10px 14px",
            borderRadius: "8px",
            border: newRow ? "none" : "1px solid rgba(244,241,234,.14)",
            cursor: "pointer",
          }}
        >
          {newRow ? "Add" : "Save"}
        </button>
        {onDelete && (
          <button
            type="button"
            onClick={onDelete}
            disabled={pending}
            style={{
              background: "transparent",
              color: "#ff8a8a",
              fontWeight: 800,
              fontSize: "11.5px",
              padding: "10px 12px",
              borderRadius: "8px",
              border: "1px solid rgba(255,138,138,.3)",
              cursor: "pointer",
            }}
          >
            ×
          </button>
        )}
      </div>
      {err && (
        <div style={{ gridColumn: "1 / -1", color: "#ff8a8a", fontSize: "12.5px", fontWeight: 700 }}>{err}</div>
      )}
    </div>
  );
}
