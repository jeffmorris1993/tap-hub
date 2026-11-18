import { notFound } from "next/navigation";
import { requireLead } from "../../../../../lib/portal-auth";
import { supabaseAdmin } from "../../../../../lib/supabase/server";
import { CHURCH_TZ } from "../../../../../lib/tz";
import { parseStoredResponses } from "../../../../../lib/event-signup-forms";
import { FormControls } from "./FormControls";

export const dynamic = "force-dynamic";

type SubmissionRow = {
  id: string;
  responses: unknown;
  created_at: string;
};

function whenLabel(iso: string): string {
  return new Date(iso).toLocaleString("en-US", {
    timeZone: CHURCH_TZ,
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default async function FormDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireLead();
  const { id } = await params;

  const admin = supabaseAdmin();
  const [{ data: form, error }, { data: subs, error: subsError }] = await Promise.all([
    admin
      .from("forms")
      .select("id, slug, title, open, notify_emails, created_at")
      .eq("id", id)
      .maybeSingle(),
    admin
      .from("form_submissions")
      .select("id, responses, created_at")
      .eq("form_id", id)
      .order("created_at", { ascending: false }),
  ]);
  if (error) throw error;
  if (!form) notFound();
  if (subsError) throw subsError;
  const submissions = (subs ?? []) as SubmissionRow[];

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
        {form.title}
      </h1>
      <p style={{ color: "#9aa3b8", fontSize: "13.5px", fontWeight: 600, margin: "0 0 14px" }}>
        {form.open ? "Open" : "Closed"} · {submissions.length}{" "}
        {submissions.length === 1 ? "response" : "responses"} · sends to{" "}
        {((form.notify_emails as string[] | null) ?? []).join(", ") || "no one"}
      </p>

      <div style={{ marginBottom: "26px" }}>
        <FormControls
          id={form.id}
          slug={form.slug}
          open={form.open}
          submissionCount={submissions.length}
        />
      </div>

      {submissions.length === 0 ? (
        <p style={{ color: "#6a738b", fontSize: "14px", fontWeight: 600 }}>
          No responses yet — copy the link above and send it out.
        </p>
      ) : (
        <div style={{ display: "grid", gap: "12px" }}>
          {submissions.map((s) => {
            const responses = parseStoredResponses(s.responses);
            return (
              <div
                key={s.id}
                style={{
                  background: "#0e1526",
                  border: "1px solid rgba(244,241,234,.1)",
                  borderRadius: "13px",
                  padding: "15px 16px",
                }}
              >
                <div
                  style={{
                    fontSize: "11px",
                    fontWeight: 800,
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    color: "#6a738b",
                    marginBottom: "10px",
                  }}
                >
                  {whenLabel(s.created_at)}
                </div>
                <div style={{ display: "grid", gap: "9px" }}>
                  {responses.map((r) => (
                    <div key={r.id}>
                      <div
                        style={{
                          fontSize: "10.5px",
                          fontWeight: 800,
                          letterSpacing: "0.1em",
                          textTransform: "uppercase",
                          color: "#9aa3b8",
                        }}
                      >
                        {r.label}
                      </div>
                      <div style={{ fontSize: "14.5px", fontWeight: 600, color: "#f4f1ea", marginTop: "2px" }}>
                        {Array.isArray(r.value) ? r.value.join(", ") : r.value}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
