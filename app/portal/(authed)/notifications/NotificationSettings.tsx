"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useToast } from "../Toaster";
import {
  NOTIFICATION_KINDS,
  NOTIFICATION_KIND_CONFIG,
  type NotificationKind,
} from "../../../../lib/notification-kinds";
import { avatarInitials, staffDisplayName } from "../../../../lib/staff-display";
import { saveNotificationRoutes } from "./actions";
import { AvatarStack, type AvatarItem } from "./Avatar";
import { KindCard, type KindDraft } from "./KindCard";
import { oxford, type DefaultRecipient, type StaffProfile } from "./recipients";

type Draft = Record<NotificationKind, KindDraft>;

/**
 * One draft for all three kinds behind a single Save bar.
 *
 * Staff and extras are tracked separately so switching to "Pastoral team" and
 * back restores what was picked instead of discarding it — the saved payload
 * flattens them only when mode is "custom".
 */
function toDraft(
  routes: Record<NotificationKind, string[]>,
  staffEmails: Set<string>,
): Draft {
  const out = {} as Draft;
  for (const kind of NOTIFICATION_KINDS) {
    const recipients = routes[kind] ?? [];
    out[kind] = {
      // Non-empty stored recipients mean someone chose a custom list; empty (or
      // no row) means fall back to the pastoral default. The action refuses to
      // save an empty custom list, which is what keeps this round-trip honest.
      mode: recipients.length > 0 ? "custom" : "default",
      staff: recipients.filter((e) => staffEmails.has(e)),
      extras: recipients.filter((e) => !staffEmails.has(e)),
    };
  }
  return out;
}

function payloadFor(d: KindDraft): string[] {
  return d.mode === "custom" ? [...d.staff, ...d.extras] : [];
}

/**
 * Comparison key for the unsaved-changes check. Recipients are sorted here but
 * not on screen, so re-picking the same people in a different order doesn't
 * read as dirty while chips still follow selection order.
 */
function draftKey(d: Draft): string {
  return NOTIFICATION_KINDS.map((k) => `${k}:${[...payloadFor(d[k])].sort().join(",")}`).join("|");
}

export function NotificationSettings({
  staff,
  routes,
  defaults,
  pastoralTeam,
}: {
  staff: StaffProfile[];
  routes: Record<NotificationKind, string[]>;
  defaults: Record<NotificationKind, DefaultRecipient[]>;
  pastoralTeam: StaffProfile[];
}) {
  const staffEmails = new Set(staff.map((p) => p.email));
  const [draft, setDraft] = useState<Draft>(() => toDraft(routes, staffEmails));
  const [baseline, setBaseline] = useState<Draft>(draft);
  // Prayer starts open so the page explains itself on arrival: the first thing
  // you see is the real recipient list, which is the whole point of the screen.
  const [expanded, setExpanded] = useState<Partial<Record<NotificationKind, boolean>>>({
    prayer: true,
  });
  // Part of each card's key, so Discard remounts them and clears search boxes
  // and half-typed addresses along with the draft.
  const [resetNonce, setResetNonce] = useState(0);
  const [pending, startTransition] = useTransition();
  const { toast } = useToast();

  const dirty = draftKey(draft) !== draftKey(baseline);
  const blocked = NOTIFICATION_KINDS.some(
    (k) => draft[k].mode === "custom" && payloadFor(draft[k]).length === 0,
  );

  const pastoralItems: AvatarItem[] = pastoralTeam.map((p) => ({
    initials: avatarInitials(p.full_name, p.email),
    kind: "pastoral",
  }));

  function save() {
    if (blocked) return;
    startTransition(async () => {
      const result = await saveNotificationRoutes(
        NOTIFICATION_KINDS.map((kind) => ({
          kind,
          mode: draft[kind].mode,
          recipients: payloadFor(draft[kind]),
        })),
      );
      if (!result.ok) {
        toast(result.error, "error");
        return;
      }
      // Rebase on what actually landed: the action lowercases and dedupes, so
      // reusing the local draft would leave a chip showing its pre-normalized
      // text and the page reading dirty forever.
      const next = toDraft(result.saved, staffEmails);
      setDraft(next);
      setBaseline(next);
      toast("Notification settings saved", "success");
    });
  }

  function discard() {
    setDraft(baseline);
    setResetNonce((n) => n + 1);
    setExpanded({});
  }

  return (
    <div
      style={{
        maxWidth: "920px",
        display: "flex",
        flexDirection: "column",
        gap: "20px",
        paddingBottom: dirty ? "110px" : undefined,
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
        <p style={{ fontSize: "17px", lineHeight: 1.55, color: "#cdd3e0", textWrap: "pretty" }}>
          Choose who gets an email for each type of submission. Anything you don&apos;t
          customize goes to the <strong style={{ color: "#f4f1ea" }}>Pastoral team</strong>.
        </p>
        <div
          style={{
            background: "#121a2e",
            border: "1px solid rgba(244,241,234,.08)",
            borderRadius: "14px",
            padding: "14px 16px",
            display: "flex",
            alignItems: "center",
            gap: "14px",
            flexWrap: "wrap",
          }}
        >
          <AvatarStack items={pastoralItems} size={36} />
          <div
            style={{
              flex: "1 1 240px",
              minWidth: 0,
              display: "flex",
              flexDirection: "column",
              gap: "3px",
            }}
          >
            <span
              style={{
                fontSize: "12px",
                fontWeight: 800,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                color: "#7fe0a0",
              }}
            >
              Pastoral team today
            </span>
            <span style={{ fontWeight: 700, fontSize: "15px", lineHeight: 1.4, color: "#f4f1ea" }}>
              {pastoralTeam.length > 0
                ? oxford(pastoralTeam.map((p) => staffDisplayName(p.full_name, p.email)))
                : "No one has the Pastoral role yet."}
            </span>
          </div>
          <Link
            href="/portal/users"
            style={{
              fontWeight: 800,
              fontSize: "14px",
              color: "#e7b84e",
              textDecoration: "underline",
              textUnderlineOffset: "4px",
              minHeight: "44px",
              display: "flex",
              alignItems: "center",
            }}
          >
            Change roles in Users
          </Link>
        </div>
      </div>

      {NOTIFICATION_KIND_CONFIG.map((config) => (
        <KindCard
          key={`${config.kind}:${resetNonce}`}
          config={config}
          value={draft[config.kind]}
          onChange={(next) => setDraft((d) => ({ ...d, [config.kind]: next }))}
          staff={staff}
          defaults={defaults[config.kind] ?? []}
          expanded={!!expanded[config.kind]}
          onToggle={() =>
            setExpanded((e) => ({ ...e, [config.kind]: !e[config.kind] }))
          }
        />
      ))}

      {dirty && (
        <div
          className="p-savebar"
          style={{
            background: "rgba(13,20,36,.97)",
            backdropFilter: "blur(8px)",
            borderTop: "1px solid rgba(244,241,234,.12)",
            padding: "14px clamp(16px,3vw,36px)",
            display: "flex",
            alignItems: "center",
            gap: "12px",
            flexWrap: "wrap",
          }}
        >
          <div
            role="status"
            aria-live="polite"
            style={{ flex: "1 1 220px", color: "#cdd3e0", fontSize: "15px", fontWeight: 700 }}
          >
            {blocked
              ? "One list has no one on it. Fix it before saving."
              : "You have unsaved changes."}
          </div>
          <button
            type="button"
            onClick={discard}
            disabled={pending}
            style={{
              minHeight: "52px",
              padding: "0 20px",
              borderRadius: "12px",
              border: "2px solid rgba(244,241,234,.25)",
              background: "transparent",
              color: "#f4f1ea",
              fontWeight: 800,
              fontSize: "15px",
              cursor: pending ? "wait" : "pointer",
            }}
          >
            Discard
          </button>
          {/* aria-disabled, not disabled: the button stays focusable so a
              screen reader user can reach it and hear why it won't save. */}
          <button
            type="button"
            onClick={save}
            aria-disabled={blocked || pending}
            style={{
              minHeight: "52px",
              padding: "0 24px",
              borderRadius: "12px",
              border: "none",
              fontWeight: 800,
              fontSize: "15px",
              cursor: blocked ? "not-allowed" : pending ? "wait" : "pointer",
              background: blocked ? "#3a4358" : "#e7b84e",
              color: blocked ? "#aab3c5" : "#0b101c",
            }}
          >
            {pending ? "Saving…" : "Save changes"}
          </button>
        </div>
      )}
    </div>
  );
}
