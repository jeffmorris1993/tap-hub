import { requireLead } from "../../../../lib/portal-auth";
import { supabaseAdmin } from "../../../../lib/supabase/server";
import { CHURCH_TZ } from "../../../../lib/tz";
import { CreateFormCard } from "./CreateFormCard";
import { FormAdminCard, type FormListItem } from "./FormAdminCard";

export const dynamic = "force-dynamic";

/**
 * One-off forms: standalone question forms that live at their own random
 * link (/f/<slug>) — not tied to an announcement or an event. Each response
 * is emailed to the form's notify list and collected here.
 */

type Row = {
  id: string;
  slug: string;
  title: string;
  open: boolean;
  created_at: string;
  notify_emails: string[] | null;
  form_submissions: { count: number }[] | null;
};

export default async function FormsPage() {
  await requireLead();

  const { data, error } = await supabaseAdmin()
    .from("forms")
    .select("id, slug, title, open, created_at, notify_emails, form_submissions(count)")
    .order("created_at", { ascending: false });
  if (error) throw error;
  const rows = (data ?? []) as unknown as Row[];

  const items: FormListItem[] = rows.map((r) => ({
    id: r.id,
    slug: r.slug,
    title: r.title,
    open: r.open,
    createdLabel: new Date(r.created_at).toLocaleDateString("en-US", {
      timeZone: CHURCH_TZ,
      month: "short",
      day: "numeric",
      year: "numeric",
    }),
    submissionCount: r.form_submissions?.[0]?.count ?? 0,
    notifyEmails: r.notify_emails ?? [],
  }));

  return (
    <div>
      <h1
        style={{
          fontFamily: "var(--font-anton)",
          fontWeight: 400,
          textTransform: "uppercase",
          fontSize: "32px",
          lineHeight: 1,
          margin: "0 0 6px",
        }}
      >
        One-off forms
      </h1>
      <p style={{ color: "#9aa3b8", fontSize: "13.5px", fontWeight: 600, margin: "0 0 24px" }}>
        Standalone forms with their own private link — send it to anyone, and every response is
        emailed to the people you choose.
      </p>

      <div style={{ display: "grid", gap: "14px" }}>
        <CreateFormCard />
        {items.map((item) => (
          <FormAdminCard key={item.id} item={item} />
        ))}
      </div>
    </div>
  );
}
