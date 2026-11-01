"use client";

import type { CSSProperties } from "react";
import { ROLE_BADGE, avatarInitials, staffDisplayName } from "../../../../lib/staff-display";
import type { NotificationKindConfig } from "../../../../lib/notification-kinds";
import { Avatar, AvatarStack, NeutralTag, RoleTag, type AvatarItem } from "./Avatar";
import { StaffPicker } from "./StaffPicker";
import { ExtraEmails } from "./ExtraEmails";
import { oxford, summaryText, type DefaultRecipient, type StaffProfile } from "./recipients";

export type KindDraft = {
  mode: "default" | "custom";
  /** Emails of selected staff accounts. */
  staff: string[];
  /** Addresses with no account. */
  extras: string[];
};

const CARD_PAD = "clamp(18px,3vw,26px)";

const eyebrow: CSSProperties = {
  fontSize: "12px",
  fontWeight: 800,
  letterSpacing: "0.1em",
  textTransform: "uppercase",
};

const sectionLabel: CSSProperties = { fontWeight: 800, fontSize: "16px", color: "#f4f1ea" };

function optionStyle(on: boolean): CSSProperties {
  return {
    display: "flex",
    gap: "14px",
    alignItems: "flex-start",
    width: "100%",
    padding: "16px",
    borderRadius: "14px",
    cursor: "pointer",
    color: "#f4f1ea",
    textAlign: "left",
    border: `2px solid ${on ? "#e7b84e" : "rgba(244,241,234,.14)"}`,
    background: on ? "rgba(231,184,78,.08)" : "#0b101c",
  };
}

function Radio({ on }: { on: boolean }) {
  return (
    <span
      aria-hidden="true"
      style={{
        width: "24px",
        height: "24px",
        borderRadius: "50%",
        flexShrink: 0,
        marginTop: "1px",
        border: `2px solid ${on ? "#e7b84e" : "#7e889e"}`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <span
        style={{
          width: "11px",
          height: "11px",
          borderRadius: "50%",
          background: on ? "#e7b84e" : "transparent",
        }}
      />
    </span>
  );
}

/** Label and avatar for a resolved default recipient. */
function defaultRow(r: DefaultRecipient): {
  name: string;
  sub: string;
  item: AvatarItem;
  tag: React.ReactNode;
} {
  if (r.source === "staff") {
    const badge = ROLE_BADGE[r.profile.role];
    return {
      name: staffDisplayName(r.profile.full_name, r.profile.email),
      sub: r.profile.full_name?.trim() ? r.profile.email : "No name on account",
      item: {
        initials: avatarInitials(r.profile.full_name, r.profile.email),
        kind: r.profile.role === "lead" ? "lead" : "pastoral",
      },
      tag: <RoleTag label={badge.longLabel} bg={badge.bg} color={badge.color} />,
    };
  }
  if (r.source === "group") {
    return {
      name: "Prayer team",
      sub: r.email,
      item: { initials: avatarInitials(null, r.email), kind: "extra" },
      tag: <NeutralTag label="Group" />,
    };
  }
  return {
    name: r.email,
    sub: "No TapHub account",
    item: { initials: avatarInitials(null, r.email), kind: "extra" },
    tag: <NeutralTag label="Email only" />,
  };
}

export function KindCard({
  config,
  value,
  onChange,
  staff,
  defaults,
  expanded,
  onToggle,
}: {
  config: NotificationKindConfig;
  value: KindDraft;
  onChange: (next: KindDraft) => void;
  staff: StaffProfile[];
  defaults: DefaultRecipient[];
  expanded: boolean;
  onToggle: () => void;
}) {
  const isDefault = value.mode === "default";
  const byEmail = new Map(staff.map((p) => [p.email, p]));
  const selectedStaff = value.staff
    .map((e) => byEmail.get(e))
    .filter((p): p is StaffProfile => !!p);

  // What the summary and the result banner describe.
  const recipients: AvatarItem[] = isDefault
    ? defaults.map((r) => defaultRow(r).item)
    : [
        ...selectedStaff.map((p) => ({
          initials: avatarInitials(p.full_name, p.email),
          kind: (p.role === "lead" ? "lead" : "pastoral") as AvatarItem["kind"],
        })),
        ...value.extras.map((e) => ({
          initials: avatarInitials(null, e),
          kind: "extra" as const,
        })),
      ];
  const names = isDefault
    ? defaults.map((r) => defaultRow(r).name)
    : [...selectedStaff.map((p) => staffDisplayName(p.full_name, p.email)), ...value.extras];

  const isEmpty = !isDefault && names.length === 0;

  // Anyone outside the pastoral role on a confidential kind. An address with
  // no account is outside it by definition, which is the likelier real case —
  // a deacon's personal email added to prayer requests.
  const reachesOutsidePastoral =
    selectedStaff.some((p) => p.role !== "pastoral") || value.extras.length > 0;
  const confidentialWarning =
    config.confidential && !isDefault && !isEmpty && reachesOutsidePastoral;

  const modeLabel = isDefault
    ? "Pastoral team (default)"
    : isEmpty
      ? "No one selected"
      : "Specific people";
  const modeColor = isDefault ? "#7fe0a0" : isEmpty ? "#f08a96" : "#e7b84e";

  const bodyId = `notify-body-${config.kind}`;

  function toggleStaff(email: string) {
    onChange({
      ...value,
      staff: value.staff.includes(email)
        ? value.staff.filter((e) => e !== email)
        : [...value.staff, email],
    });
  }

  function setMany(emails: string[], on: boolean) {
    onChange({
      ...value,
      staff: on
        ? [...value.staff, ...emails.filter((e) => !value.staff.includes(e))]
        : value.staff.filter((e) => !emails.includes(e)),
    });
  }

  return (
    <section
      style={{
        background: "#121a2e",
        border: "1px solid rgba(244,241,234,.08)",
        borderRadius: "18px",
        overflow: "hidden",
      }}
    >
      <button
        type="button"
        className="p-cardhead"
        onClick={onToggle}
        aria-expanded={expanded}
        aria-controls={bodyId}
        style={{
          width: "100%",
          textAlign: "left",
          border: "none",
          color: "#f4f1ea",
          cursor: "pointer",
          padding: CARD_PAD,
          display: "flex",
          gap: "16px",
          alignItems: "flex-start",
        }}
      >
        <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: "12px" }}>
          <span style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            <span style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
              <span
                style={{
                  fontFamily: "var(--font-anton)",
                  fontWeight: 400,
                  textTransform: "uppercase",
                  fontSize: "24px",
                  lineHeight: 1,
                }}
              >
                {config.title}
              </span>
              {config.confidential && (
                <span
                  style={{
                    fontSize: "11px",
                    fontWeight: 800,
                    letterSpacing: "0.1em",
                    textTransform: "uppercase",
                    color: "#cdd3e0",
                    border: "1px solid rgba(244,241,234,.25)",
                    padding: "4px 8px",
                    borderRadius: "6px",
                  }}
                >
                  Confidential
                </span>
              )}
            </span>
            <span style={{ color: "#aab3c5", fontSize: "15px", lineHeight: 1.45 }}>
              {config.description}
            </span>
          </span>
          <span style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
            <AvatarStack items={recipients} size={34} />
            <span
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "2px",
                minWidth: 0,
                flex: "1 1 200px",
              }}
            >
              <span style={{ ...eyebrow, color: modeColor }}>{modeLabel}</span>
              <span style={{ fontWeight: 700, fontSize: "15px", lineHeight: 1.4 }}>
                {isEmpty ? "No one will be emailed" : summaryText(names)}
              </span>
            </span>
          </span>
        </span>
        <span
          style={{
            flexShrink: 0,
            minHeight: "44px",
            padding: "0 14px",
            borderRadius: "10px",
            border: "1.5px solid rgba(244,241,234,.2)",
            display: "flex",
            alignItems: "center",
            fontWeight: 800,
            fontSize: "14px",
          }}
        >
          {expanded ? "Done" : "Edit"}
        </span>
      </button>

      {expanded && (
        <div
          id={bodyId}
          style={{
            borderTop: "1px solid rgba(244,241,234,.08)",
            padding: CARD_PAD,
            display: "flex",
            flexDirection: "column",
            gap: "22px",
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            <span style={sectionLabel}>Who gets this email?</span>
            <div
              role="radiogroup"
              aria-label="Who gets this email?"
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit,minmax(min(260px,100%),1fr))",
                gap: "10px",
              }}
            >
              <button
                type="button"
                role="radio"
                aria-checked={isDefault}
                onClick={() => onChange({ ...value, mode: "default" })}
                style={optionStyle(isDefault)}
              >
                <Radio on={isDefault} />
                <span style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                  <span style={{ fontWeight: 800, fontSize: "16px" }}>Pastoral team</span>
                  <span style={{ color: "#aab3c5", fontSize: "14px", lineHeight: 1.45 }}>
                    Everyone with the Pastoral role. Updates on its own when roles change.
                  </span>
                </span>
              </button>
              <button
                type="button"
                role="radio"
                aria-checked={!isDefault}
                onClick={() => onChange({ ...value, mode: "custom" })}
                style={optionStyle(!isDefault)}
              >
                <Radio on={!isDefault} />
                <span style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                  <span style={{ fontWeight: 800, fontSize: "16px" }}>Specific people</span>
                  <span style={{ color: "#aab3c5", fontSize: "14px", lineHeight: 1.45 }}>
                    Only the staff and emails you choose. The Pastoral team won&apos;t get it
                    unless you check them.
                  </span>
                </span>
              </button>
            </div>
          </div>

          {isDefault ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              <span style={sectionLabel}>These people will be emailed</span>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  border: "1px solid rgba(244,241,234,.1)",
                  borderRadius: "14px",
                  overflow: "hidden",
                }}
              >
                {defaults.map((r, i) => {
                  const row = defaultRow(r);
                  return (
                    <div
                      key={r.email}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "12px",
                        padding: "12px 14px",
                        borderBottom:
                          i === defaults.length - 1
                            ? "none"
                            : "1px solid rgba(244,241,234,.06)",
                      }}
                    >
                      <Avatar
                        initials={row.item.initials}
                        kind={row.item.kind}
                        size={36}
                        ringColor={null}
                      />
                      <span
                        style={{
                          flex: 1,
                          minWidth: 0,
                          display: "flex",
                          flexDirection: "column",
                          gap: "2px",
                        }}
                      >
                        <span
                          style={{
                            fontWeight: 700,
                            fontSize: "15px",
                            color: "#f4f1ea",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                          }}
                        >
                          {row.name}
                        </span>
                        <span
                          style={{
                            color: "#aab3c5",
                            fontSize: "13px",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                          }}
                        >
                          {row.sub}
                        </span>
                      </span>
                      {row.tag}
                    </div>
                  );
                })}
                {defaults.length === 0 && (
                  <div style={{ padding: "18px 14px", color: "#f08a96", fontSize: "15px" }}>
                    No one has the Pastoral role and no approver emails are configured, so
                    nothing would be sent. Assign a pastoral account in Users.
                  </div>
                )}
              </div>
            </div>
          ) : (
            <>
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "baseline",
                    gap: "12px",
                    flexWrap: "wrap",
                  }}
                >
                  <span style={sectionLabel}>Staff</span>
                  <span style={{ color: "#aab3c5", fontSize: "14px", fontWeight: 600 }}>
                    {value.staff.length} of {staff.length} selected
                  </span>
                </div>

                {selectedStaff.length > 0 && (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                    {selectedStaff.map((p) => (
                      <span
                        key={p.id}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "8px",
                          background: "#0b101c",
                          border: "1px solid rgba(244,241,234,.18)",
                          borderRadius: "999px",
                          padding: "4px",
                          minHeight: "42px",
                          maxWidth: "100%",
                          color: "#f4f1ea",
                        }}
                      >
                        <Avatar
                          initials={avatarInitials(p.full_name, p.email)}
                          kind={p.role === "lead" ? "lead" : "pastoral"}
                          size={32}
                          ringColor={null}
                        />
                        <span
                          style={{
                            fontWeight: 700,
                            fontSize: "14px",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {staffDisplayName(p.full_name, p.email)}
                        </span>
                        <button
                          type="button"
                          className="p-iconbtn"
                          aria-label={`Remove ${staffDisplayName(p.full_name, p.email)}`}
                          onClick={() => toggleStaff(p.email)}
                          style={{
                            width: "32px",
                            height: "32px",
                            borderRadius: "50%",
                            border: "none",
                            fontSize: "18px",
                            cursor: "pointer",
                            flexShrink: 0,
                          }}
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                )}

                <StaffPicker
                  staff={staff}
                  selected={value.staff}
                  onToggle={toggleStaff}
                  onSetMany={setMany}
                />
              </div>

              <ExtraEmails
                inputId={`extra-${config.kind}`}
                value={value.extras}
                staff={staff}
                onChange={(extras) => onChange({ ...value, extras })}
                onSelectStaff={(emails) => setMany(emails, true)}
              />
            </>
          )}

          <div
            role="status"
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "4px",
              padding: "14px 16px",
              borderRadius: "12px",
              border: `1px solid ${isEmpty ? "rgba(240,138,150,.45)" : "rgba(90,208,127,.35)"}`,
              background: isEmpty ? "rgba(181,50,65,.12)" : "rgba(90,208,127,.08)",
            }}
          >
            <span style={{ ...eyebrow, color: isEmpty ? "#f08a96" : "#7fe0a0" }}>
              {isEmpty ? "No one will get this email" : "When this is submitted, we email"}
            </span>
            <span style={{ fontWeight: 700, fontSize: "15px", lineHeight: 1.5, color: "#f4f1ea" }}>
              {isEmpty
                ? "Check at least one person, add an email address, or switch back to the Pastoral team."
                : `${oxford(names)}.${
                    confidentialWarning
                      ? " Some of these people are outside the Pastoral team and will see confidential requests."
                      : ""
                  }`}
            </span>
          </div>
        </div>
      )}
    </section>
  );
}
