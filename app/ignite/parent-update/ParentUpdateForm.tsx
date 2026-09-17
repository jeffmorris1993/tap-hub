"use client";

import Link from "next/link";
import { useRef, useState, useTransition } from "react";
import { PhoneShell } from "../../../components/PhoneShell";
import { BackBar } from "../../../components/BackBar";
import {
  CONTACT_PREFERENCES,
  GRADES,
  MAX_CHILDREN,
  PARTICIPATION_HELPS,
  RELATIONSHIP_SUGGESTIONS,
  TSHIRT_SIZES,
  VOLUNTEER_AREAS,
  VOLUNTEER_INTEREST,
  emptyChild,
  emptySubmission,
  validateChild,
  validateStep,
  type ChildInput,
  type FieldErrors,
  type ParentUpdateSubmission,
} from "../../../lib/ignite-parent-form";
import { submitParentUpdate, type ParentUpdateResult } from "./actions";

const STEPS = [
  { title: "Parent / Guardian", sub: "Who we should talk to" },
  { title: "Children", sub: "Add everyone in Ignite" },
  { title: "Supporting Your Family", sub: "All optional" },
  { title: "Getting Involved", sub: "Only if you'd like to" },
  { title: "Anything Else", sub: "The last question" },
];

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "14px 15px",
  border: "1.5px solid rgba(244,241,234,.14)",
  borderRadius: "11px",
  fontSize: "15px",
  color: "#f4f1ea",
  background: "#0b101c",
  outline: "none",
  fontFamily: "inherit",
  colorScheme: "dark",
};

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: "11.5px",
  fontWeight: 800,
  letterSpacing: "0.07em",
  textTransform: "uppercase",
  color: "#cdd3e0",
};

const helperStyle: React.CSSProperties = {
  fontSize: "12.5px",
  color: "#9aa3b8",
  lineHeight: 1.5,
  marginTop: "6px",
};

const errorTextStyle: React.CSSProperties = {
  color: "#ff8a8a",
  fontSize: "12.5px",
  fontWeight: 700,
  marginTop: "6px",
};

const sectionGap = "20px";

function invalid(style: React.CSSProperties, bad: boolean): React.CSSProperties {
  return bad ? { ...style, border: "1.5px solid rgba(255,138,138,.6)" } : style;
}

/** Label + optional helper + error, wired to the control via id. */
function Field({
  id,
  label,
  optional,
  helper,
  error,
  children,
}: {
  id: string;
  label: string;
  optional?: boolean;
  helper?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div style={{ marginBottom: sectionGap }}>
      <label htmlFor={id} style={{ ...labelStyle, marginBottom: "7px" }}>
        {label}
        {optional && (
          <span style={{ color: "#6a738b", fontWeight: 700 }}> · Optional</span>
        )}
      </label>
      {helper && <div style={{ ...helperStyle, marginTop: 0, marginBottom: "8px" }}>{helper}</div>}
      {children}
      {error && (
        <div id={`${id}-error`} style={errorTextStyle} aria-live="polite">
          {error}
        </div>
      )}
    </div>
  );
}

function CheckRow({
  checked,
  label,
  onToggle,
}: {
  checked: boolean;
  label: string;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={checked}
      style={{
        display: "flex",
        alignItems: "center",
        gap: "12px",
        width: "100%",
        textAlign: "left",
        background: checked ? "rgba(231,184,78,.1)" : "#121a2e",
        border: `1.5px solid ${checked ? "rgba(231,184,78,.5)" : "rgba(244,241,234,.08)"}`,
        borderRadius: "12px",
        padding: "13px 15px",
        cursor: "pointer",
        color: "#f4f1ea",
        minHeight: "48px",
        fontFamily: "inherit",
      }}
    >
      <span
        style={{
          width: "24px",
          height: "24px",
          borderRadius: "7px",
          flexShrink: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: checked ? "#e7b84e" : "transparent",
          border: `1.5px solid ${checked ? "#e7b84e" : "rgba(244,241,234,.25)"}`,
        }}
      >
        {checked && (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#0b101c" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 6L9 17l-5-5" />
          </svg>
        )}
      </span>
      <span style={{ fontSize: "14.5px", fontWeight: 600 }}>{label}</span>
    </button>
  );
}

function RadioRow({
  checked,
  label,
  onSelect,
}: {
  checked: boolean;
  label: string;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={checked}
      style={{
        display: "flex",
        alignItems: "center",
        gap: "12px",
        width: "100%",
        textAlign: "left",
        background: checked ? "rgba(231,184,78,.1)" : "#121a2e",
        border: `1.5px solid ${checked ? "rgba(231,184,78,.5)" : "rgba(244,241,234,.08)"}`,
        borderRadius: "12px",
        padding: "14px 15px",
        cursor: "pointer",
        color: "#f4f1ea",
        minHeight: "48px",
        fontFamily: "inherit",
      }}
    >
      <span
        style={{
          width: "22px",
          height: "22px",
          borderRadius: "50%",
          flexShrink: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          border: `1.5px solid ${checked ? "#e7b84e" : "rgba(244,241,234,.25)"}`,
        }}
      >
        {checked && (
          <span style={{ width: "11px", height: "11px", borderRadius: "50%", background: "#e7b84e" }} />
        )}
      </span>
      <span style={{ fontSize: "14.5px", fontWeight: 600 }}>{label}</span>
    </button>
  );
}

export function ParentUpdateForm() {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<ParentUpdateSubmission>(emptySubmission);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [result, setResult] = useState<ParentUpdateResult | null>(null);
  const [pending, startTransition] = useTransition();

  // Child editor state. `draft` is null when the list is showing.
  const [draft, setDraft] = useState<ChildInput | null>(null);
  const [draftIndex, setDraftIndex] = useState<number | null>(null);
  const [draftErrors, setDraftErrors] = useState<FieldErrors>({});

  const topRef = useRef<HTMLDivElement>(null);

  function set<K extends keyof ParentUpdateSubmission>(
    key: K,
    value: ParentUpdateSubmission[K],
  ) {
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((e) => {
      if (!e[key as string]) return e;
      const next = { ...e };
      delete next[key as string];
      return next;
    });
  }

  function toggleIn(key: "volunteerAreas" | "participationHelps", label: string) {
    setForm((f) => {
      const cur = f[key];
      return {
        ...f,
        [key]: cur.includes(label) ? cur.filter((x) => x !== label) : [...cur, label],
      };
    });
  }

  function scrollTop() {
    topRef.current?.scrollIntoView({ block: "start", behavior: "smooth" });
  }

  function goNext() {
    const found = validateStep(step, form);
    if (Object.keys(found).length > 0) {
      setErrors(found);
      return;
    }
    setErrors({});
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
    scrollTop();
  }

  function goBack() {
    setErrors({});
    setStep((s) => Math.max(s - 1, 0));
    scrollTop();
  }

  function openChild(index: number | null) {
    setDraft(index === null ? emptyChild() : { ...form.children[index] });
    setDraftIndex(index);
    setDraftErrors({});
  }

  function saveChild() {
    if (!draft) return;
    const found = validateChild(draft);
    if (Object.keys(found).length > 0) {
      setDraftErrors(found);
      return;
    }
    setForm((f) => {
      const children = [...f.children];
      if (draftIndex === null) children.push(draft);
      else children[draftIndex] = draft;
      return { ...f, children };
    });
    setErrors((e) => {
      const next = { ...e };
      delete next.children;
      return next;
    });
    setDraft(null);
    setDraftIndex(null);
    setDraftErrors({});
  }

  function removeChild(index: number) {
    setForm((f) => ({ ...f, children: f.children.filter((_, i) => i !== index) }));
  }

  function setDraftField<K extends keyof ChildInput>(key: K, value: ChildInput[K]) {
    setDraft((d) => (d ? { ...d, [key]: value } : d));
    setDraftErrors((e) => {
      if (!e[key as string]) return e;
      const next = { ...e };
      delete next[key as string];
      return next;
    });
  }

  function onSubmit() {
    startTransition(async () => {
      const r = await submitParentUpdate(form);
      setResult(r);
      if (r.ok) scrollTop();
    });
  }

  // ── Success ────────────────────────────────────────────────────────────
  if (result?.ok) {
    return (
      <PhoneShell>
        <div className="th-slide" style={{ minHeight: "100vh" }}>
          <BackBar title="Ignite Parent Update" subtitle="Ignite Youth · 2027" />
          <div className="th-up" style={{ padding: "60px 26px", textAlign: "center" }}>
            <div
              style={{
                width: "80px",
                height: "80px",
                borderRadius: "50%",
                background: "#1a2438",
                border: "1px solid rgba(231,184,78,.35)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto",
              }}
            >
              <svg width="38" height="38" viewBox="0 0 24 24" fill="none" stroke="#e7b84e" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 6L9 17l-5-5" />
              </svg>
            </div>
            <h3
              style={{
                fontFamily: "var(--font-anton)",
                fontWeight: 400,
                textTransform: "uppercase",
                fontSize: "32px",
                marginTop: "22px",
              }}
            >
              Thank You!
            </h3>
            <p style={{ color: "#cdd3e0", fontSize: "15.5px", fontWeight: 600, lineHeight: 1.6, marginTop: "12px" }}>
              Your family&apos;s information has been received.
            </p>
            <p style={{ color: "#9aa3b8", fontSize: "14.5px", fontWeight: 500, lineHeight: 1.6, marginTop: "12px" }}>
              Thank you for helping us prepare for Ignite Youth in 2027. Your feedback will help us
              better serve our young people and partner with our families.
            </p>
            <Link
              href="/"
              style={{
                display: "inline-block",
                marginTop: "28px",
                background: "#1a2438",
                color: "#fff",
                border: "1px solid rgba(244,241,234,.14)",
                fontWeight: 800,
                fontSize: "13px",
                letterSpacing: "0.05em",
                textTransform: "uppercase",
                padding: "15px 34px",
                borderRadius: "11px",
                textDecoration: "none",
              }}
            >
              Return to Tap Hub
            </Link>
          </div>
        </div>
      </PhoneShell>
    );
  }

  const isLast = step === STEPS.length - 1;
  const showVolunteerDetail =
    form.volunteerInterest === "yes" || form.volunteerInterest === "maybe";

  return (
    <PhoneShell>
      <div className="th-slide" style={{ minHeight: "100vh" }}>
        <div ref={topRef} />
        <BackBar title="Ignite Parent Update" subtitle="Ignite Youth · 2027" />

        {/* progress */}
        <div
          style={{
            position: "sticky",
            top: "63px",
            zIndex: 15,
            background: "rgba(11,16,28,.94)",
            backdropFilter: "blur(12px)",
            WebkitBackdropFilter: "blur(12px)",
            borderBottom: "1px solid rgba(244,241,234,.08)",
            padding: "12px 18px 13px",
          }}
        >
          <div style={{ display: "flex", gap: "5px", marginBottom: "9px" }}>
            {STEPS.map((s, i) => (
              <span
                key={s.title}
                style={{
                  flex: 1,
                  height: "4px",
                  borderRadius: "2px",
                  background: i <= step ? "#e7b84e" : "rgba(244,241,234,.14)",
                }}
              />
            ))}
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: "10px" }}>
            <span
              style={{
                fontFamily: "var(--font-anton)",
                fontWeight: 400,
                textTransform: "uppercase",
                fontSize: "16px",
                lineHeight: 1,
              }}
            >
              {STEPS[step].title}
            </span>
            <span
              style={{
                fontSize: "10.5px",
                fontWeight: 800,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                color: "#6a738b",
                whiteSpace: "nowrap",
              }}
            >
              Step {step + 1} of {STEPS.length}
            </span>
          </div>
        </div>

        <div style={{ padding: "20px 18px 40px" }}>
          {/* ── Step 1 · Guardians ─────────────────────────────────── */}
          {step === 0 && (
            <>
              <p style={{ color: "#9aa3b8", fontSize: "14.5px", fontWeight: 500, lineHeight: 1.55, marginBottom: "22px" }}>
                We&apos;re updating our family records as we plan for 2027. This takes about five
                minutes, and you only need to fill it out once for your whole household.
              </p>

              <Field id="guardianName" label="Your Full Name" error={errors.guardianName}>
                <input
                  id="guardianName"
                  value={form.guardianName}
                  onChange={(e) => set("guardianName", e.target.value)}
                  placeholder="First & last name"
                  autoComplete="name"
                  aria-describedby={errors.guardianName ? "guardianName-error" : undefined}
                  style={invalid(inputStyle, !!errors.guardianName)}
                />
              </Field>

              <Field
                id="guardianRelationship"
                label="Relationship to Child / Children"
                error={errors.guardianRelationship}
              >
                <input
                  id="guardianRelationship"
                  list="relationship-options"
                  value={form.guardianRelationship}
                  onChange={(e) => set("guardianRelationship", e.target.value)}
                  placeholder="Mother, Father, Grandparent…"
                  aria-describedby={errors.guardianRelationship ? "guardianRelationship-error" : undefined}
                  style={invalid(inputStyle, !!errors.guardianRelationship)}
                />
                <datalist id="relationship-options">
                  {RELATIONSHIP_SUGGESTIONS.map((r) => (
                    <option key={r} value={r} />
                  ))}
                </datalist>
              </Field>

              <Field id="guardianPhone" label="Phone Number" error={errors.guardianPhone}>
                <input
                  id="guardianPhone"
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  value={form.guardianPhone}
                  onChange={(e) => set("guardianPhone", e.target.value)}
                  placeholder="(248) 555-0123"
                  aria-describedby={errors.guardianPhone ? "guardianPhone-error" : undefined}
                  style={invalid(inputStyle, !!errors.guardianPhone)}
                />
              </Field>

              <Field id="guardianEmail" label="Email Address" error={errors.guardianEmail}>
                <input
                  id="guardianEmail"
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  value={form.guardianEmail}
                  onChange={(e) => set("guardianEmail", e.target.value)}
                  placeholder="you@email.com"
                  aria-describedby={errors.guardianEmail ? "guardianEmail-error" : undefined}
                  style={invalid(inputStyle, !!errors.guardianEmail)}
                />
              </Field>

              <Field
                id="contactPreference"
                label="Preferred Way to Reach You"
                error={errors.contactPreference}
              >
                <div id="contactPreference" style={{ display: "flex", flexDirection: "column", gap: "9px" }}>
                  {CONTACT_PREFERENCES.map((p) => (
                    <RadioRow
                      key={p.value}
                      label={p.label}
                      checked={form.contactPreference === p.value}
                      onSelect={() => set("contactPreference", p.value)}
                    />
                  ))}
                </div>
              </Field>

              <div
                style={{
                  borderTop: "1px solid rgba(244,241,234,.08)",
                  paddingTop: "22px",
                  marginTop: "6px",
                }}
              >
                <div
                  style={{
                    fontSize: "11.5px",
                    fontWeight: 800,
                    letterSpacing: "0.14em",
                    textTransform: "uppercase",
                    color: "#6a738b",
                    marginBottom: "6px",
                  }}
                >
                  Additional Parent / Guardian
                </div>
                <p style={{ ...helperStyle, marginTop: 0, marginBottom: "18px" }}>
                  Optional — add a second contact if there&apos;s someone else we should keep in the loop.
                </p>

                <Field id="secondGuardianName" label="Full Name" optional>
                  <input
                    id="secondGuardianName"
                    value={form.secondGuardianName}
                    onChange={(e) => set("secondGuardianName", e.target.value)}
                    placeholder="First & last name"
                    style={inputStyle}
                  />
                </Field>

                <Field id="secondGuardianRelationship" label="Relationship" optional>
                  <input
                    id="secondGuardianRelationship"
                    list="relationship-options"
                    value={form.secondGuardianRelationship}
                    onChange={(e) => set("secondGuardianRelationship", e.target.value)}
                    placeholder="Mother, Father, Grandparent…"
                    style={inputStyle}
                  />
                </Field>

                <Field
                  id="secondGuardianPhone"
                  label="Phone Number"
                  optional
                  error={errors.secondGuardianPhone}
                >
                  <input
                    id="secondGuardianPhone"
                    type="tel"
                    inputMode="tel"
                    value={form.secondGuardianPhone}
                    onChange={(e) => set("secondGuardianPhone", e.target.value)}
                    placeholder="(248) 555-0123"
                    aria-describedby={errors.secondGuardianPhone ? "secondGuardianPhone-error" : undefined}
                    style={invalid(inputStyle, !!errors.secondGuardianPhone)}
                  />
                </Field>

                <Field
                  id="secondGuardianEmail"
                  label="Email Address"
                  optional
                  error={errors.secondGuardianEmail}
                >
                  <input
                    id="secondGuardianEmail"
                    type="email"
                    inputMode="email"
                    value={form.secondGuardianEmail}
                    onChange={(e) => set("secondGuardianEmail", e.target.value)}
                    placeholder="them@email.com"
                    aria-describedby={errors.secondGuardianEmail ? "secondGuardianEmail-error" : undefined}
                    style={invalid(inputStyle, !!errors.secondGuardianEmail)}
                  />
                </Field>
              </div>
            </>
          )}

          {/* ── Step 2 · Children ──────────────────────────────────── */}
          {step === 1 && (
            <>
              {draft === null ? (
                <>
                  <p style={{ color: "#9aa3b8", fontSize: "14.5px", fontWeight: 500, lineHeight: 1.55, marginBottom: "18px" }}>
                    Add each child or teen in your household who is part of Ignite — or who you&apos;d
                    like to be.
                  </p>

                  {form.children.length > 0 && (
                    <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "16px" }}>
                      {form.children.map((child, i) => (
                        <div
                          key={i}
                          style={{
                            background: "#121a2e",
                            border: "1px solid rgba(244,241,234,.08)",
                            borderRadius: "13px",
                            padding: "15px 16px",
                            display: "flex",
                            alignItems: "center",
                            gap: "12px",
                          }}
                        >
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: "15.5px", fontWeight: 700, color: "#f4f1ea" }}>
                              {child.fullName}
                            </div>
                            <div style={{ fontSize: "12.5px", color: "#9aa3b8", marginTop: "3px" }}>
                              {[child.grade && `Grade ${child.grade}`, child.school]
                                .filter(Boolean)
                                .join(" · ")}
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => openChild(i)}
                            style={{
                              background: "#1a2438",
                              border: "1px solid rgba(244,241,234,.12)",
                              borderRadius: "9px",
                              color: "#e7b84e",
                              fontSize: "11.5px",
                              fontWeight: 800,
                              letterSpacing: "0.05em",
                              textTransform: "uppercase",
                              padding: "10px 14px",
                              cursor: "pointer",
                              fontFamily: "inherit",
                            }}
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => removeChild(i)}
                            aria-label={`Remove ${child.fullName}`}
                            style={{
                              background: "transparent",
                              border: "1px solid rgba(244,241,234,.12)",
                              borderRadius: "9px",
                              color: "#9aa3b8",
                              width: "40px",
                              height: "40px",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              cursor: "pointer",
                              flexShrink: 0,
                            }}
                          >
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                              <path d="M6 6l12 12M18 6L6 18" />
                            </svg>
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {form.children.length < MAX_CHILDREN && (
                    <button
                      type="button"
                      onClick={() => openChild(null)}
                      style={{
                        width: "100%",
                        background: "transparent",
                        border: "1.5px dashed rgba(231,184,78,.45)",
                        borderRadius: "13px",
                        color: "#e7b84e",
                        fontSize: "14px",
                        fontWeight: 800,
                        letterSpacing: "0.04em",
                        textTransform: "uppercase",
                        padding: "18px",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "10px",
                        fontFamily: "inherit",
                      }}
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
                        <path d="M12 5v14M5 12h14" />
                      </svg>
                      {form.children.length === 0 ? "Add a Child" : "Add Another Child"}
                    </button>
                  )}

                  {errors.children && (
                    <div style={{ ...errorTextStyle, marginTop: "12px" }} aria-live="polite">
                      {errors.children}
                    </div>
                  )}
                </>
              ) : (
                /* child editor */
                <>
                  <div
                    style={{
                      fontFamily: "var(--font-anton)",
                      fontWeight: 400,
                      textTransform: "uppercase",
                      fontSize: "20px",
                      marginBottom: "18px",
                    }}
                  >
                    {draftIndex === null ? "Add a Child" : "Edit Child"}
                  </div>

                  <Field id="childName" label="Full Name" error={draftErrors.fullName}>
                    <input
                      id="childName"
                      value={draft.fullName}
                      onChange={(e) => setDraftField("fullName", e.target.value)}
                      placeholder="First & last name"
                      aria-describedby={draftErrors.fullName ? "childName-error" : undefined}
                      style={invalid(inputStyle, !!draftErrors.fullName)}
                    />
                  </Field>

                  <Field id="childDob" label="Date of Birth" error={draftErrors.dateOfBirth}>
                    <input
                      id="childDob"
                      type="date"
                      value={draft.dateOfBirth}
                      onChange={(e) => setDraftField("dateOfBirth", e.target.value)}
                      aria-describedby={draftErrors.dateOfBirth ? "childDob-error" : undefined}
                      style={invalid(inputStyle, !!draftErrors.dateOfBirth)}
                    />
                  </Field>

                  <Field id="childGrade" label="Current Grade" error={draftErrors.grade}>
                    <select
                      id="childGrade"
                      value={draft.grade}
                      onChange={(e) => setDraftField("grade", e.target.value)}
                      aria-describedby={draftErrors.grade ? "childGrade-error" : undefined}
                      style={{
                        ...invalid(inputStyle, !!draftErrors.grade),
                        WebkitAppearance: "none",
                        appearance: "none",
                      }}
                    >
                      <option value="">Choose a grade…</option>
                      {GRADES.map((g) => (
                        <option key={g} value={g}>
                          {g}
                        </option>
                      ))}
                    </select>
                  </Field>

                  <Field id="childSchool" label="School" optional>
                    <input
                      id="childSchool"
                      value={draft.school}
                      onChange={(e) => setDraftField("school", e.target.value)}
                      placeholder="School name"
                      style={inputStyle}
                    />
                  </Field>

                  <Field id="childShirt" label="T-Shirt Size" optional>
                    <select
                      id="childShirt"
                      value={draft.tshirtSize}
                      onChange={(e) => setDraftField("tshirtSize", e.target.value)}
                      style={{ ...inputStyle, WebkitAppearance: "none", appearance: "none" }}
                    >
                      <option value="">Choose a size…</option>
                      {TSHIRT_SIZES.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </Field>

                  <Field
                    id="childInterests"
                    label="About Them"
                    helper="Interests, hobbies, talents, or things they enjoy."
                    error={draftErrors.interests}
                  >
                    <textarea
                      id="childInterests"
                      rows={3}
                      value={draft.interests}
                      onChange={(e) => setDraftField("interests", e.target.value)}
                      placeholder="Basketball, drawing, loves being around younger kids…"
                      aria-describedby={draftErrors.interests ? "childInterests-error" : undefined}
                      style={{ ...invalid(inputStyle, !!draftErrors.interests), resize: "vertical" }}
                    />
                  </Field>

                  <Field
                    id="childSpiritual"
                    label="What do you believe this child needs most spiritually right now?"
                    helper="Examples might include understanding Scripture, prayer, confidence in their faith, friendships, making wise decisions, consistency, discovering their gifts, leadership, etc."
                    error={draftErrors.spiritualNeeds}
                  >
                    <textarea
                      id="childSpiritual"
                      rows={3}
                      value={draft.spiritualNeeds}
                      onChange={(e) => setDraftField("spiritualNeeds", e.target.value)}
                      aria-describedby={draftErrors.spiritualNeeds ? "childSpiritual-error" : undefined}
                      style={{ ...invalid(inputStyle, !!draftErrors.spiritualNeeds), resize: "vertical" }}
                    />
                  </Field>

                  <Field
                    id="childSupport"
                    label="Is there anything that would help Ignite better support this child?"
                    optional
                  >
                    <textarea
                      id="childSupport"
                      rows={3}
                      value={draft.supportNotes}
                      onChange={(e) => setDraftField("supportNotes", e.target.value)}
                      style={{ ...inputStyle, resize: "vertical" }}
                    />
                  </Field>

                  <Field
                    id="childHealth"
                    label="Health, allergy or accessibility needs"
                    optional
                    helper="Only share what you believe Ignite leadership needs in order to safely support your child. This is kept private to Ignite leadership."
                  >
                    <textarea
                      id="childHealth"
                      rows={3}
                      value={draft.healthNotes}
                      onChange={(e) => setDraftField("healthNotes", e.target.value)}
                      style={{ ...inputStyle, resize: "vertical" }}
                    />
                  </Field>

                  <div style={{ display: "flex", gap: "10px" }}>
                    <button
                      type="button"
                      onClick={() => {
                        setDraft(null);
                        setDraftIndex(null);
                        setDraftErrors({});
                      }}
                      style={{
                        flex: 1,
                        background: "#1a2438",
                        color: "#cdd3e0",
                        border: "1px solid rgba(244,241,234,.14)",
                        fontWeight: 800,
                        fontSize: "13px",
                        letterSpacing: "0.05em",
                        textTransform: "uppercase",
                        padding: "16px",
                        borderRadius: "11px",
                        cursor: "pointer",
                        fontFamily: "inherit",
                      }}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={saveChild}
                      style={{
                        flex: 2,
                        background: "#e7b84e",
                        color: "#0b101c",
                        border: "none",
                        fontWeight: 800,
                        fontSize: "13px",
                        letterSpacing: "0.05em",
                        textTransform: "uppercase",
                        padding: "16px",
                        borderRadius: "11px",
                        cursor: "pointer",
                        fontFamily: "inherit",
                      }}
                    >
                      {draftIndex === null ? "Add Child" : "Save Changes"}
                    </button>
                  </div>
                </>
              )}
            </>
          )}

          {/* ── Step 3 · Family feedback ───────────────────────────── */}
          {step === 2 && (
            <>
              <p style={{ color: "#9aa3b8", fontSize: "14.5px", fontWeight: 500, lineHeight: 1.55, marginBottom: "22px" }}>
                These are for your household as a whole. Answer whichever ones you&apos;d like —
                we&apos;ll also talk through them together at the parent meeting.
              </p>

              <Field
                id="supportParents"
                label="How can Ignite Youth better support you as a parent or guardian?"
                optional
              >
                <textarea
                  id="supportParents"
                  rows={4}
                  value={form.supportParents}
                  onChange={(e) => set("supportParents", e.target.value)}
                  style={{ ...inputStyle, resize: "vertical" }}
                />
              </Field>

              <Field
                id="moreOf2027"
                label="What would you like to see more of from Ignite Youth in 2027?"
                optional
              >
                <textarea
                  id="moreOf2027"
                  rows={4}
                  value={form.moreOf2027}
                  onChange={(e) => set("moreOf2027", e.target.value)}
                  style={{ ...inputStyle, resize: "vertical" }}
                />
              </Field>

              <Field
                id="wishOffered"
                label="Is there something you wish Ignite offered that we currently don't?"
                optional
              >
                <textarea
                  id="wishOffered"
                  rows={4}
                  value={form.wishOffered}
                  onChange={(e) => set("wishOffered", e.target.value)}
                  style={{ ...inputStyle, resize: "vertical" }}
                />
              </Field>

              <Field
                id="couldImprove"
                label="Is there anything Ignite currently does that could be changed or improved?"
                optional
              >
                <textarea
                  id="couldImprove"
                  rows={4}
                  value={form.couldImprove}
                  onChange={(e) => set("couldImprove", e.target.value)}
                  style={{ ...inputStyle, resize: "vertical" }}
                />
              </Field>
            </>
          )}

          {/* ── Step 4 · Involvement ───────────────────────────────── */}
          {step === 3 && (
            <>
              <p style={{ color: "#9aa3b8", fontSize: "14.5px", fontWeight: 500, lineHeight: 1.55, marginBottom: "22px" }}>
                Ignite runs on a lot of different kinds of help, and every family&apos;s season looks
                different. Whatever you pick here is genuinely fine.
              </p>

              <Field id="volunteerInterest" label="Would you be interested in helping Ignite Youth during 2027?" optional>
                <div id="volunteerInterest" style={{ display: "flex", flexDirection: "column", gap: "9px" }}>
                  {VOLUNTEER_INTEREST.map((v) => (
                    <RadioRow
                      key={v.value}
                      label={v.label}
                      checked={form.volunteerInterest === v.value}
                      onSelect={() => set("volunteerInterest", v.value)}
                    />
                  ))}
                </div>
              </Field>

              {showVolunteerDetail && (
                <div className="th-up">
                  <Field
                    id="volunteerAreas"
                    label="What types of opportunities might interest you?"
                    helper="Pick as many as you like."
                    optional
                  >
                    <div id="volunteerAreas" style={{ display: "flex", flexDirection: "column", gap: "9px" }}>
                      {VOLUNTEER_AREAS.map((a) => (
                        <CheckRow
                          key={a}
                          label={a}
                          checked={form.volunteerAreas.includes(a)}
                          onToggle={() => toggleIn("volunteerAreas", a)}
                        />
                      ))}
                    </div>
                  </Field>

                  {form.volunteerAreas.includes("Other") && (
                    <Field id="volunteerAreasOther" label="Tell us more" error={errors.volunteerAreasOther}>
                      <input
                        id="volunteerAreasOther"
                        value={form.volunteerAreasOther}
                        onChange={(e) => set("volunteerAreasOther", e.target.value)}
                        placeholder="What did you have in mind?"
                        aria-describedby={errors.volunteerAreasOther ? "volunteerAreasOther-error" : undefined}
                        style={invalid(inputStyle, !!errors.volunteerAreasOther)}
                      />
                    </Field>
                  )}

                  <Field
                    id="participationHelps"
                    label="What would make it easier for you to participate?"
                    helper="Pick as many as apply."
                    optional
                  >
                    <div id="participationHelps" style={{ display: "flex", flexDirection: "column", gap: "9px" }}>
                      {PARTICIPATION_HELPS.map((h) => (
                        <CheckRow
                          key={h}
                          label={h}
                          checked={form.participationHelps.includes(h)}
                          onToggle={() => toggleIn("participationHelps", h)}
                        />
                      ))}
                    </div>
                  </Field>

                  {form.participationHelps.includes("Other") && (
                    <Field id="participationHelpsOther" label="Tell us more" error={errors.participationHelpsOther}>
                      <input
                        id="participationHelpsOther"
                        value={form.participationHelpsOther}
                        onChange={(e) => set("participationHelpsOther", e.target.value)}
                        placeholder="What would help?"
                        aria-describedby={errors.participationHelpsOther ? "participationHelpsOther-error" : undefined}
                        style={invalid(inputStyle, !!errors.participationHelpsOther)}
                      />
                    </Field>
                  )}
                </div>
              )}
            </>
          )}

          {/* ── Step 5 · Final ─────────────────────────────────────── */}
          {step === 4 && (
            <>
              <Field
                id="anythingElse"
                label="Is there anything else you want Ignite Youth leadership to know about your family or your hopes for Ignite Youth in 2027?"
                optional
              >
                <textarea
                  id="anythingElse"
                  rows={6}
                  value={form.anythingElse}
                  onChange={(e) => set("anythingElse", e.target.value)}
                  style={{ ...inputStyle, resize: "vertical" }}
                />
              </Field>

              {/* summary */}
              <div
                style={{
                  background: "#121a2e",
                  border: "1px solid rgba(244,241,234,.08)",
                  borderRadius: "13px",
                  padding: "16px 18px",
                  marginBottom: "18px",
                }}
              >
                <div
                  style={{
                    fontSize: "10.5px",
                    fontWeight: 800,
                    letterSpacing: "0.14em",
                    textTransform: "uppercase",
                    color: "#6a738b",
                    marginBottom: "9px",
                  }}
                >
                  You&apos;re submitting
                </div>
                <div style={{ fontSize: "14.5px", fontWeight: 700, color: "#f4f1ea" }}>
                  {form.guardianName || "Your family"}
                </div>
                <div style={{ fontSize: "13px", color: "#9aa3b8", marginTop: "4px" }}>
                  {form.children.length === 1
                    ? "1 child"
                    : `${form.children.length} children`}
                  {form.children.length > 0 &&
                    ` · ${form.children.map((c) => c.fullName.split(/\s+/)[0]).join(", ")}`}
                </div>
              </div>

              <div
                style={{
                  background: "rgba(231,184,78,.07)",
                  border: "1px solid rgba(231,184,78,.22)",
                  borderRadius: "12px",
                  padding: "14px 16px",
                  marginBottom: "18px",
                }}
              >
                <p style={{ margin: 0, fontSize: "12.5px", lineHeight: 1.6, color: "#cdd3e0" }}>
                  Your information will only be used by Nehemiah&apos;s Temple / Ignite Youth
                  leadership for ministry communication, planning, and supporting our youth and
                  families.
                </p>
              </div>
            </>
          )}

          {/* error from the server */}
          {result && !result.ok && (
            <div style={{ ...errorTextStyle, fontSize: "13px", marginBottom: "12px" }} aria-live="polite">
              {result.error}
            </div>
          )}

          {/* nav — hidden while the child editor is open */}
          {!(step === 1 && draft !== null) && (
            <div style={{ display: "flex", gap: "10px", marginTop: "8px" }}>
              {step > 0 && (
                <button
                  type="button"
                  onClick={goBack}
                  disabled={pending}
                  style={{
                    flex: 1,
                    background: "#1a2438",
                    color: "#cdd3e0",
                    border: "1px solid rgba(244,241,234,.14)",
                    fontWeight: 800,
                    fontSize: "13px",
                    letterSpacing: "0.05em",
                    textTransform: "uppercase",
                    padding: "17px",
                    borderRadius: "12px",
                    cursor: pending ? "wait" : "pointer",
                    fontFamily: "inherit",
                  }}
                >
                  Back
                </button>
              )}
              <button
                type="button"
                onClick={isLast ? onSubmit : goNext}
                disabled={pending}
                style={{
                  flex: step > 0 ? 2 : 1,
                  background: "#e7b84e",
                  color: "#0b101c",
                  fontWeight: 800,
                  fontSize: "14px",
                  letterSpacing: "0.05em",
                  textTransform: "uppercase",
                  padding: "17px",
                  borderRadius: "12px",
                  border: "none",
                  cursor: pending ? "wait" : "pointer",
                  opacity: pending ? 0.7 : 1,
                  fontFamily: "inherit",
                }}
              >
                {isLast ? (pending ? "Sending…" : "Submit") : "Next →"}
              </button>
            </div>
          )}
        </div>
      </div>
    </PhoneShell>
  );
}
