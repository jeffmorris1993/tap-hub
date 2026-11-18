/**
 * Shared shape + validation for standalone one-off forms (/f/<slug>).
 *
 * Deliberately isomorphic (no "server-only"), same doctrine as
 * event-signup-forms.ts: the public form and the admin builder import it for
 * inline validation, and the Server Actions import it to re-validate
 * authoritatively, so there is exactly one definition of what "valid" means.
 *
 * Storage:
 * - forms.fields              jsonb  FormField[] (the SignupField shape)
 * - form_submissions.responses jsonb StoredResponse[] — answers snapshot
 *   their question label at submit time.
 */

import {
  MAX_LABEL,
  MAX_OPTIONS,
  MAX_QUESTIONS,
  parseFieldList,
  type SignupField,
} from "./event-signup-forms";

export type FormField = SignupField;

export const MAX_FORM_TITLE = 120;
export const MAX_FORM_INTRO = 600;
export const MAX_NOTIFY_EMAILS = 10;

/** Defensive parse of forms.fields. */
export function parseFormFields(raw: unknown): FormField[] {
  return parseFieldList(raw);
}

/**
 * Admin-save check of an untrusted field config. Runs on the RAW value
 * (before parseFormFields), because the parse silently drops exactly the
 * mistakes an admin needs to hear about — blank labels, choice questions
 * with no options. Returns a human-readable problem, or null when clean.
 */
export function validateFormFieldConfig(raw: unknown): string | null {
  if (!Array.isArray(raw)) return "Add at least one question.";
  if (raw.length === 0) return "Add at least one question.";
  if (raw.length > MAX_QUESTIONS) return `Keep it to ${MAX_QUESTIONS} questions or fewer.`;
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const f = item as Record<string, unknown>;
    const label = typeof f.label === "string" ? f.label.trim() : "";
    if (!label) return "Every question needs a label (or delete the empty one).";
    if (label.length > MAX_LABEL) {
      return `Question labels need to stay under ${MAX_LABEL} characters.`;
    }
    if (f.type === "select" || f.type === "checkboxes") {
      const options = Array.isArray(f.options)
        ? f.options.filter((o) => typeof o === "string" && o.trim())
        : [];
      if (options.length === 0) return `"${label}" needs at least one option (one per line).`;
      if (options.length > MAX_OPTIONS) return `"${label}" has too many options (max ${MAX_OPTIONS}).`;
    }
  }
  return null;
}
