import { NextResponse } from "next/server";
import { getPortalUser } from "../../../../../../lib/portal-auth";
import { getAdminEventById, listSignupsForEvent } from "../../../../../../lib/supabase/admin-queries";
import { toCsv } from "../../../../../../lib/csv";
import { detroitDateIso } from "../../../../../../lib/tz";
import { fmtDateTime } from "../../../../../../lib/format";
import {
  ATTENDANCE_LABEL,
  parseSignupQuestions,
  parseStoredResponses,
} from "../../../../../../lib/event-signup-forms";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  // proxy.ts gates /portal/*, but a route handler is its own entry point —
  // verify here too. Same scope as editing the event: pastoral, or a lead
  // whose ministries include the event's category.
  const pu = await getPortalUser();
  if (!pu || (pu.role !== "pastoral" && pu.role !== "lead")) {
    return new NextResponse("Not authorized", { status: 403 });
  }

  const { id } = await params;
  const event = await getAdminEventById(id);
  if (!event) return new NextResponse("Not found", { status: 404 });
  if (pu.role !== "pastoral" && !pu.ministries.includes(event.category)) {
    return new NextResponse("Not authorized", { status: 403 });
  }

  const signups = await listSignupsForEvent(id);
  const recurring = event.recurrence_kind !== "none";

  // Question columns: the event's current schema order (attendee then
  // volunteer), plus any labels found only in stored responses — renamed or
  // deleted questions still export what people answered.
  const sq = parseSignupQuestions(event.signup_questions);
  const questionLabels: string[] = [];
  for (const field of [...sq.attendee, ...sq.volunteer]) {
    if (!questionLabels.includes(field.label)) questionLabels.push(field.label);
  }
  const parsed = signups.map((s) => ({ ...s, parsedResponses: parseStoredResponses(s.responses) }));
  for (const s of parsed) {
    for (const r of s.parsedResponses) {
      if (!questionLabels.includes(r.label)) questionLabels.push(r.label);
    }
  }

  const headers = [
    "Name",
    "Contact",
    "Role",
    "Attending for sure",
    ...(recurring ? ["Date attending"] : []),
    "Notes",
    ...questionLabels,
    "Submitted",
  ];

  const rows = parsed.map((s) => [
    s.name,
    s.contact,
    s.role,
    s.attendance ? ATTENDANCE_LABEL[s.attendance] : "",
    ...(recurring ? [s.occurrence_date ?? ""] : []),
    s.notes ?? "",
    ...questionLabels.map((label) => {
      const match = s.parsedResponses.find((r) => r.label === label);
      if (!match) return "";
      return Array.isArray(match.value) ? match.value.join("; ") : match.value;
    }),
    fmtDateTime(s.created_at),
  ]);

  const csv = toCsv(headers, rows);
  const filename = `${event.slug}-signups-${detroitDateIso()}.csv`;
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
