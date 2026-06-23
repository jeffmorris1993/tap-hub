import "server-only";

/**
 * Maps Twilio "From" phone numbers to the staff member's @nehtemple.org
 * email. Stored as a single env var so we can reuse the existing approver
 * and allowlist gating (which keys off email) without a new DB table.
 *
 * Format: comma-separated `phone=email` pairs. Phone should be E.164
 * (e.g. +12485551234). Example:
 *   ADMIN_PHONE_MAP="+12485551234=pastorjones@nehtemple.org,+12485556789=pastorprice@nehtemple.org"
 */
function parseMap(): Map<string, string> {
  const raw = process.env.ADMIN_PHONE_MAP ?? "";
  const out = new Map<string, string>();
  for (const pair of raw.split(",")) {
    const [phone, email] = pair.split("=").map((s) => s.trim());
    if (phone && email) out.set(phone, email.toLowerCase());
  }
  return out;
}

export function emailForPhone(phone: string | null | undefined): string | null {
  if (!phone) return null;
  return parseMap().get(phone.trim()) ?? null;
}

export function listMappedPhones(): string[] {
  return [...parseMap().keys()];
}
