// Email shape check + "did you mean…?" domain-typo suggestions.
//
// Written after a member signed up as "…@nehtemple.irg", never got the
// confirmation mail, and signed up a second time correctly — leaving two
// accounts with the same name. The signup action had no email validation at
// all, so nothing caught it.
//
// This is deliberately a *suggestion*, never a block: members sign up with any
// email address, so an unlisted-but-valid domain has to keep working. Callers
// show the suggestion, and let the person insist on what they typed.

/**
 * Loose on purpose — the same shape used by the check-in, event-signup, and
 * notification-route validators. It catches "forgot the @" and "forgot the
 * TLD", not every RFC edge case; deliverability is proven by the confirmation
 * email, not by a regex.
 */
export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isEmailShaped(value: string): boolean {
  return EMAIL_RE.test(value.trim());
}

/**
 * Domains we're willing to correct toward. The church's own address comes
 * first so it wins any tie — a misspelling by someone on staff is far more
 * likely to be meant for nehtemple.org than for a lookalike consumer domain.
 */
const KNOWN_DOMAINS = [
  "nehtemple.org",
  "gmail.com",
  "yahoo.com",
  "hotmail.com",
  "outlook.com",
  "icloud.com",
  "me.com",
  "aol.com",
  "comcast.net",
  "att.net",
  "sbcglobal.net",
  "live.com",
  "msn.com",
];

const KNOWN = new Set(KNOWN_DOMAINS);

/**
 * Fat-fingered top-level domains. The edit-distance pass below catches most of
 * these on its own, but the table is deterministic and runs first so the
 * common cases can never depend on distance tuning.
 */
const TLD_FIXES: Record<string, string> = {
  irg: "org",
  ogr: "org",
  orgg: "org",
  rog: "org",
  or: "org",
  rg: "org",
  con: "com",
  cmo: "com",
  ocm: "com",
  comm: "com",
  cim: "com",
  vom: "com",
  xom: "com",
  co: "com",
  nte: "net",
  nett: "net",
  ner: "net",
  ent: "net",
};

/**
 * True when `a` becomes `b` with at most one insertion, deletion, or
 * substitution, or one transposition of adjacent characters.
 */
function withinOneEdit(a: string, b: string): boolean {
  if (a === b) return true;
  const la = a.length;
  const lb = b.length;
  if (Math.abs(la - lb) > 1) return false;

  if (la === lb) {
    let diff = -1;
    for (let i = 0; i < la; i++) {
      if (a[i] === b[i]) continue;
      if (diff >= 0) {
        // A second difference is only forgivable as a swap of this character
        // and the previous one, with everything after it matching.
        return (
          diff === i - 1 &&
          a[diff] === b[i] &&
          a[i] === b[diff] &&
          a.slice(i + 1) === b.slice(i + 1)
        );
      }
      diff = i;
    }
    return diff >= 0;
  }

  // One insertion or deletion: walk the shorter string against the longer and
  // allow exactly one skip.
  const short = la < lb ? a : b;
  const long = la < lb ? b : a;
  let i = 0;
  let j = 0;
  let skipped = false;
  while (i < short.length && j < long.length) {
    if (short[i] === long[j]) {
      i++;
      j++;
      continue;
    }
    if (skipped) return false;
    skipped = true;
    j++;
  }
  return true;
}

/**
 * A corrected address to offer, or null when there's nothing to suggest —
 * either the domain is already one we know, or it's too far from all of them
 * to guess at.
 *
 *   suggestEmailFix("evangtolbert@nehtemple.irg")  // "evangtolbert@nehtemple.org"
 *   suggestEmailFix("someone@gmial.com")           // "someone@gmail.com"
 *   suggestEmailFix("someone@gmail.com")           // null — already right
 *   suggestEmailFix("someone@mycompany.io")        // null — not ours to correct
 */
export function suggestEmailFix(email: string): string | null {
  const trimmed = (email ?? "").trim().toLowerCase();
  if (!EMAIL_RE.test(trimmed)) return null;

  const at = trimmed.lastIndexOf("@");
  const local = trimmed.slice(0, at);
  const domain = trimmed.slice(at + 1);
  if (!local || !domain || KNOWN.has(domain)) return null;

  // 1. A known-bad TLD, where the rest of the domain is already something we
  //    recognise.
  const dot = domain.lastIndexOf(".");
  if (dot > 0) {
    const fixedTld = TLD_FIXES[domain.slice(dot + 1)];
    if (fixedTld) {
      const candidate = `${domain.slice(0, dot)}.${fixedTld}`;
      if (KNOWN.has(candidate)) return `${local}@${candidate}`;
    }
  }

  // 2. The right name with the wrong TLD — "nehtemple.com" rather than a
  //    fat-fingered "nehtemple.irg". Requires the name to match a known
  //    domain's exactly, so this can't fire on an unrelated address.
  if (dot > 0) {
    const name = domain.slice(0, dot);
    for (const known of KNOWN_DOMAINS) {
      const knownDot = known.lastIndexOf(".");
      if (known.slice(0, knownDot) === name) return `${local}@${known}`;
    }
  }

  // 3. One edit away from a domain we know. First match wins, and the list is
  //    ordered so nehtemple.org gets first refusal.
  for (const known of KNOWN_DOMAINS) {
    if (withinOneEdit(domain, known)) return `${local}@${known}`;
  }

  return null;
}
