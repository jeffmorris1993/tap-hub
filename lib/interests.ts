/**
 * What a guest can ask to hear more about. Shared by the "I'm New Here" page
 * and the guest section of the check-in form so both offer the same options
 * and the stored visitors.interests values stay consistent.
 */
export const INTERESTS = [
  "Salvation & Baptism",
  "Becoming a Member",
  "Joining a Ministry",
  "Ignite Youth",
  "Kids Ministry",
  "Small Groups",
  "Serving / Volunteering",
  "Prayer",
] as const;

export type Interest = (typeof INTERESTS)[number];

/** Drop anything not on the list — form input is never trusted. */
export function sanitizeInterests(values: unknown): string[] {
  if (!Array.isArray(values)) return [];
  const allowed = new Set<string>(INTERESTS);
  return [...new Set(values.filter((v): v is string => typeof v === "string" && allowed.has(v)))];
}
