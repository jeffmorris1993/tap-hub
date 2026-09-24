/**
 * Shared shape + validation for per-event custom signup questions.
 *
 * Deliberately isomorphic (no "server-only"): the public event form imports it
 * for inline validation, and the Server Actions import it to re-validate
 * authoritatively, so there is exactly one definition of what "valid" means.
 * A question's options double as the server's whitelist — submitted choice
 * values are checked against them rather than trusted.
 *
 * Storage:
 * - events.signup_questions  jsonb  { attendee: SignupField[], volunteer: SignupField[] }
 * - event_signups.responses  jsonb  StoredResponse[] — each answer snapshots its
 *   question label at submit time, so admins can rename or delete questions
 *   without rewriting what people already answered.
 * - event_signups.attendance text   'yes' | 'maybe' (attendee rows only)
 */

export type SignupFieldType = "text" | "textarea" | "select" | "checkboxes";

export type SignupField = {
  /** Stable key, generated once when the question is added. Label edits keep it. */
  id: string;
  label: string;
  type: SignupFieldType;
  required: boolean;
  /** select / checkboxes only. */
  options?: string[];
};

export type SignupRole = "attendee" | "volunteer";

export type SignupQuestions = { attendee: SignupField[]; volunteer: SignupField[] };

/** What the client submits, keyed by field id. */
export type SignupAnswers = Record<string, string | string[]>;

/** What gets stored in event_signups.responses. */
export type StoredResponse = { id: string; label: string; value: string | string[] };

export type Attendance = "yes" | "maybe";

export const ATTENDANCE_LABEL: Record<Attendance, string> = {
  yes: "Yes, for sure",
  maybe: "Not sure yet",
};

export const MAX_QUESTIONS = 10;
export const MAX_LABEL = 200;
export const MAX_OPTIONS = 20;
export const MAX_OPTION = 120;
export const MAX_ANSWER = 2000;

export const FIELD_TYPES: { value: SignupFieldType; label: string }[] = [
  { value: "text", label: "Short answer" },
  { value: "textarea", label: "Paragraph" },
  { value: "select", label: "Choose one" },
  { value: "checkboxes", label: "Choose many" },
];

const FIELD_TYPE_VALUES: SignupFieldType[] = ["text", "textarea", "select", "checkboxes"];

export function isChoiceType(type: SignupFieldType): boolean {
  return type === "select" || type === "checkboxes";
}

export function emptySignupQuestions(): SignupQuestions {
  return { attendee: [], volunteer: [] };
}

function parseField(raw: unknown): SignupField | null {
  if (!raw || typeof raw !== "object") return null;
  const f = raw as Record<string, unknown>;
  if (typeof f.id !== "string" || !f.id.trim()) return null;
  if (typeof f.label !== "string" || !f.label.trim()) return null;
  if (!FIELD_TYPE_VALUES.includes(f.type as SignupFieldType)) return null;
  const type = f.type as SignupFieldType;
  const options = isChoiceType(type)
    ? (Array.isArray(f.options) ? f.options : [])
        .filter((o): o is string => typeof o === "string" && !!o.trim())
        .map((o) => o.trim().slice(0, MAX_OPTION))
        .slice(0, MAX_OPTIONS)
    : undefined;
  if (isChoiceType(type) && (!options || options.length === 0)) return null;
  return {
    id: f.id.trim().slice(0, 60),
    label: f.label.trim().slice(0, MAX_LABEL),
    type,
    required: f.required === true,
    ...(options ? { options } : {}),
  };
}

/**
 * Defensive parse of the jsonb column (or any untrusted input). Malformed
 * fields are dropped, duplicate ids deduped, counts capped — a hand-edited bad
 * value degrades to the default form instead of crashing a page.
 */
export function parseSignupQuestions(raw: unknown): SignupQuestions {
  const out = emptySignupQuestions();
  if (!raw || typeof raw !== "object") return out;
  for (const role of ["attendee", "volunteer"] as const) {
    const list = (raw as Record<string, unknown>)[role];
    if (!Array.isArray(list)) continue;
    const seen = new Set<string>();
    for (const item of list) {
      const field = parseField(item);
      if (!field || seen.has(field.id)) continue;
      seen.add(field.id);
      out[role].push(field);
      if (out[role].length >= MAX_QUESTIONS) break;
    }
  }
  return out;
}

/** Defensive parse of event_signups.responses. */
export function parseStoredResponses(raw: unknown): StoredResponse[] {
  if (!Array.isArray(raw)) return [];
  const out: StoredResponse[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const r = item as Record<string, unknown>;
    if (typeof r.id !== "string" || typeof r.label !== "string") continue;
    if (typeof r.value === "string") {
      out.push({ id: r.id, label: r.label, value: r.value });
    } else if (Array.isArray(r.value) && r.value.every((v) => typeof v === "string")) {
      out.push({ id: r.id, label: r.label, value: r.value as string[] });
    }
  }
  return out;
}

export function questionsForRole(sq: SignupQuestions, role: SignupRole): SignupField[] {
  return sq[role] ?? [];
}

export function hasCustomQuestions(sq: SignupQuestions): boolean {
  return sq.attendee.length > 0 || sq.volunteer.length > 0;
}

/** Slugified label + numeric suffix, unique among existingIds. */
export function newFieldId(label: string, existingIds: string[]): string {
  const base =
    label
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40) || "question";
  if (!existingIds.includes(base)) return base;
  let n = 2;
  while (existingIds.includes(`${base}-${n}`)) n += 1;
  return `${base}-${n}`;
}

/**
 * Admin-save check of an untrusted question config. Runs on the RAW value
 * (before parseSignupQuestions), because the parse silently drops exactly the
 * mistakes an admin needs to hear about — blank labels, choice questions with
 * no options. Returns a human-readable problem, or null when clean.
 */
export function validateQuestionConfig(raw: unknown): string | null {
  if (!raw || typeof raw !== "object") return null;
  for (const role of ["attendee", "volunteer"] as const) {
    const list = (raw as Record<string, unknown>)[role];
    if (!Array.isArray(list)) continue;
    if (list.length > MAX_QUESTIONS) {
      return `Keep it to ${MAX_QUESTIONS} ${role} questions or fewer.`;
    }
    for (const item of list) {
      if (!item || typeof item !== "object") continue;
      const f = item as Record<string, unknown>;
      const label = typeof f.label === "string" ? f.label.trim() : "";
      if (!label) return "Every custom question needs a label (or delete the empty one).";
      if (label.length > MAX_LABEL) {
        return `Question labels need to stay under ${MAX_LABEL} characters.`;
      }
      if (f.type === "select" || f.type === "checkboxes") {
        const options = Array.isArray(f.options)
          ? f.options.filter((o) => typeof o === "string" && o.trim())
          : [];
        if (options.length === 0) {
          return `"${label}" needs at least one option (one per line).`;
        }
        if (options.length > MAX_OPTIONS) {
          return `"${label}" has too many options (max ${MAX_OPTIONS}).`;
        }
      }
    }
  }
  return null;
}

export type FieldErrors = Record<string, string>;

/**
 * Validates submitted answers against a role's questions. Keys of the result
 * are field ids. Shared by the client (inline errors) and the Server Action
 * (authoritative re-check).
 */
export function validateAnswers(fields: SignupField[], answers: SignupAnswers): FieldErrors {
  const errors: FieldErrors = {};
  for (const field of fields) {
    const value = answers[field.id];
    if (field.type === "checkboxes") {
      const list = Array.isArray(value) ? value : [];
      const invalid = list.filter((v) => !(field.options ?? []).includes(v));
      if (invalid.length > 0) {
        errors[field.id] = "One of those choices isn't an option for this question.";
      } else if (field.required && list.length === 0) {
        errors[field.id] = "Pick at least one.";
      }
      continue;
    }
    const text = typeof value === "string" ? value.trim() : "";
    if (field.type === "select") {
      if (text && !(field.options ?? []).includes(text)) {
        errors[field.id] = "That choice isn't an option for this question.";
      } else if (field.required && !text) {
        errors[field.id] = "Pick one to continue.";
      }
      continue;
    }
    if (field.required && !text) {
      errors[field.id] = "This one's required.";
    } else if (text.length > MAX_ANSWER) {
      errors[field.id] = `Please keep this under ${MAX_ANSWER} characters.`;
    }
  }
  return errors;
}

/**
 * Builds the stored snapshot from validated answers. Iterates the schema (not
 * the answers) so unknown keys from stale clients are dropped, order follows
 * the questions, and labels can't be spoofed. Empty optional answers are
 * omitted.
 */
export function buildStoredResponses(
  fields: SignupField[],
  answers: SignupAnswers,
): StoredResponse[] {
  const out: StoredResponse[] = [];
  for (const field of fields) {
    const value = answers[field.id];
    if (field.type === "checkboxes") {
      const list = (Array.isArray(value) ? value : []).filter((v) =>
        (field.options ?? []).includes(v),
      );
      if (list.length > 0) out.push({ id: field.id, label: field.label, value: list });
      continue;
    }
    const text = typeof value === "string" ? value.trim().slice(0, MAX_ANSWER) : "";
    if (!text) continue;
    if (field.type === "select" && !(field.options ?? []).includes(text)) continue;
    out.push({ id: field.id, label: field.label, value: text });
  }
  return out;
}
