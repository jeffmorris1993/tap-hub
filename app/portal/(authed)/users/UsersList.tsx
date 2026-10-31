"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteUserAccount, updateUserRole } from "./actions";
import { ConfirmDialog } from "../ConfirmDialog";
import { useToast } from "../Toaster";
import type { PortalRole } from "../../../../lib/portal-auth";

export type UserRow = {
  id: string;
  email: string;
  full_name: string | null;
  role: PortalRole;
  ministries: string[];
  created_at: string;
  isStaffEligible: boolean;
  /** Another account shares this person's name — likely a mistyped signup. */
  sharesName: boolean;
};

const MINISTRIES = ["Youth", "Sisterhood", "Brotherhood", "Marriage"];

const ROLE_BADGE: Record<PortalRole, { bg: string; color: string; label: string }> = {
  member: { bg: "rgba(154,163,184,.16)", color: "#cdd3e0", label: "Member" },
  lead: { bg: "rgba(231,184,78,.16)", color: "#e7b84e", label: "Lead" },
  pastoral: { bg: "rgba(78,184,107,.16)", color: "#7ed996", label: "Pastoral" },
};

function initials(name: string | null, email: string): string {
  const src = name?.trim() || email.split("@")[0];
  const parts = src.split(/[\s._-]+/).filter(Boolean);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase() || src.slice(0, 2).toUpperCase();
}

function Row({ user, isSelf }: { user: UserRow; isSelf: boolean }) {
  const [editing, setEditing] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [role, setRole] = useState<PortalRole>(user.role);
  const [ministries, setMinistries] = useState<string[]>(user.ministries);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const { toast } = useToast();
  const router = useRouter();

  const badge = ROLE_BADGE[user.role];
  const displayName = user.full_name?.trim() || user.email;

  function save() {
    setError(null);
    startTransition(async () => {
      const r = await updateUserRole({ profileId: user.id, role, ministries });
      if (r.ok) setEditing(false);
      else setError(r.error);
    });
  }

  function remove() {
    setError(null);
    startTransition(async () => {
      const r = await deleteUserAccount({ profileId: user.id });
      setConfirming(false);
      if (r.ok) {
        toast(`Removed ${user.email}.`, "success");
        router.refresh();
      } else {
        toast(r.error, "error");
      }
    });
  }

  return (
    <div
      style={{
        background: "#121a2e",
        border: "1px solid rgba(244,241,234,.08)",
        borderRadius: "15px",
        padding: "16px 18px",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "14px", flexWrap: "wrap" }}>
        <span
          style={{
            width: "42px",
            height: "42px",
            borderRadius: "50%",
            background: "#1a2438",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
            fontWeight: 800,
            fontSize: "13px",
            color: "#f4f1ea",
          }}
        >
          {initials(user.full_name, user.email)}
        </span>
        <div style={{ flex: 1, minWidth: "160px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "9px", flexWrap: "wrap" }}>
            <span style={{ fontWeight: 800, fontSize: "14.5px", color: "#f4f1ea" }}>
              {displayName}
            </span>
            {user.sharesName && (
              <span
                title="Another account uses this name — check whether one is a mistyped signup."
                style={{
                  fontSize: "10px",
                  fontWeight: 800,
                  letterSpacing: "0.07em",
                  textTransform: "uppercase",
                  padding: "4px 9px",
                  borderRadius: "6px",
                  background: "rgba(231,184,78,.16)",
                  color: "#e7b84e",
                }}
              >
                Duplicate name
              </span>
            )}
            <span
              style={{
                fontSize: "10px",
                fontWeight: 800,
                letterSpacing: "0.07em",
                textTransform: "uppercase",
                padding: "4px 9px",
                borderRadius: "6px",
                background: badge.bg,
                color: badge.color,
              }}
            >
              {badge.label}
              {user.role === "lead" && user.ministries.length > 0 ? ` · ${user.ministries.join(", ")}` : ""}
            </span>
          </div>
          <div style={{ fontSize: "12.5px", color: "#9aa3b8", fontWeight: 600, marginTop: "3px" }}>
            {user.email}
          </div>
        </div>
        <button
          type="button"
          onClick={() => {
            setEditing((e) => !e);
            setError(null);
            setRole(user.role);
            setMinistries(user.ministries);
          }}
          style={{
            background: editing ? "#1a2438" : "transparent",
            border: "1px solid rgba(244,241,234,.14)",
            color: "#cdd3e0",
            fontWeight: 800,
            fontSize: "11.5px",
            letterSpacing: "0.04em",
            textTransform: "uppercase",
            padding: "10px 16px",
            borderRadius: "10px",
            cursor: "pointer",
          }}
        >
          {editing ? "Close" : "Change role"}
        </button>
      </div>

      {editing && !isSelf && (
        <div
          style={{
            marginTop: "14px",
            paddingTop: "14px",
            borderTop: "1px solid rgba(244,241,234,.07)",
            display: "flex",
            alignItems: "center",
            gap: "12px",
            flexWrap: "wrap",
          }}
        >
          <button
            type="button"
            disabled={pending}
            onClick={() => setConfirming(true)}
            style={{
              background: "transparent",
              border: "1.5px solid rgba(181,50,65,.55)",
              color: "#e0707d",
              fontWeight: 800,
              fontSize: "11.5px",
              letterSpacing: "0.04em",
              textTransform: "uppercase",
              padding: "10px 16px",
              borderRadius: "10px",
              cursor: pending ? "wait" : "pointer",
            }}
          >
            Remove account
          </button>
          <span style={{ fontSize: "12px", color: "#6a738b", fontWeight: 600 }}>
            For a duplicate or mistyped signup.
          </span>
        </div>
      )}

      <ConfirmDialog
        open={confirming}
        danger
        pending={pending}
        title="Remove account?"
        confirmLabel="Remove"
        body={
          <>
            This deletes the account for <strong style={{ color: "#f4f1ea" }}>{user.email}</strong>
            {user.full_name?.trim() ? ` (${user.full_name.trim()})` : ""} and they will no longer
            be able to sign in. Anything they submitted — prayer requests, feedback, event
            signups — stays, but is no longer linked to an account. This can&apos;t be undone.
          </>
        }
        onConfirm={remove}
        onCancel={() => setConfirming(false)}
      />

      {editing && (
        <div
          style={{
            marginTop: "14px",
            paddingTop: "14px",
            borderTop: "1px solid rgba(244,241,234,.07)",
            display: "flex",
            flexDirection: "column",
            gap: "12px",
          }}
        >
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
            {(["member", "lead", "pastoral"] as PortalRole[]).map((r) => {
              const staffLocked = r !== "member" && !user.isStaffEligible;
              const on = role === r;
              return (
                <button
                  key={r}
                  type="button"
                  disabled={staffLocked}
                  title={staffLocked ? "Requires an @nehtemple.org email" : undefined}
                  onClick={() => setRole(r)}
                  style={{
                    fontWeight: 800,
                    fontSize: "12px",
                    letterSpacing: "0.04em",
                    textTransform: "uppercase",
                    padding: "10px 16px",
                    borderRadius: "9px",
                    cursor: staffLocked ? "not-allowed" : "pointer",
                    opacity: staffLocked ? 0.4 : 1,
                    background: on ? "#e7b84e" : "#1a2438",
                    color: on ? "#0b101c" : "#cdd3e0",
                    border: `1.5px solid ${on ? "#e7b84e" : "rgba(244,241,234,.12)"}`,
                  }}
                >
                  {ROLE_BADGE[r].label}
                </button>
              );
            })}
          </div>

          {role === "lead" && (
            <div>
              <div
                style={{
                  fontSize: "11px",
                  fontWeight: 800,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  color: "#9aa3b8",
                  marginBottom: "8px",
                }}
              >
                Ministries they lead
              </div>
              <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                {MINISTRIES.map((m) => {
                  const on = ministries.includes(m);
                  return (
                    <button
                      key={m}
                      type="button"
                      onClick={() =>
                        setMinistries((cur) => (on ? cur.filter((x) => x !== m) : [...cur, m]))
                      }
                      style={{
                        fontWeight: 800,
                        fontSize: "12px",
                        padding: "9px 14px",
                        borderRadius: "9px",
                        cursor: "pointer",
                        background: on ? "rgba(231,184,78,.16)" : "#1a2438",
                        color: on ? "#e7b84e" : "#cdd3e0",
                        border: `1.5px solid ${on ? "#e7b84e" : "rgba(244,241,234,.12)"}`,
                      }}
                    >
                      {m}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {error && (
            <div style={{ color: "#ff8a8a", fontSize: "13px", fontWeight: 700 }}>{error}</div>
          )}
          <div>
            <button
              type="button"
              disabled={pending}
              onClick={save}
              style={{
                background: "#e7b84e",
                color: "#0b101c",
                fontWeight: 800,
                fontSize: "12.5px",
                letterSpacing: "0.04em",
                textTransform: "uppercase",
                padding: "12px 22px",
                borderRadius: "10px",
                border: "none",
                cursor: pending ? "wait" : "pointer",
                opacity: pending ? 0.7 : 1,
              }}
            >
              {pending ? "Saving…" : "Save role"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export function UsersList({
  users,
  currentEmail,
}: {
  users: UserRow[];
  /** The signed-in pastoral user — their own row hides the remove control. */
  currentEmail: string;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
      {users.map((u) => (
        <Row key={u.id} user={u} isSelf={u.email === currentEmail} />
      ))}
    </div>
  );
}
