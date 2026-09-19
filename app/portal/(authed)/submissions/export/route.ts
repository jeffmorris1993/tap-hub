import { NextResponse, type NextRequest } from "next/server";
import { getPortalUser } from "../../../../../lib/portal-auth";
import { listIgniteFamilies } from "../../../../../lib/supabase/admin-queries";
import { toCsv } from "../../../../../lib/csv";
import { detroitDateIso } from "../../../../../lib/tz";
import { fmtDateTime } from "../../../../../lib/format";

export const dynamic = "force-dynamic";

const VOLUNTEER_LABEL: Record<string, string> = {
  yes: "Yes",
  maybe: "Maybe, depending on the opportunity",
  not_now: "Not at this time",
};

const CONTACT_LABEL: Record<string, string> = {
  text: "Text",
  email: "Email",
  flocknote: "Flocknote",
  phone: "Phone Call",
};

/** Fold the "Other" free text into the selected list so one column reads whole. */
function joinWithOther(values: string[], other: string | null): string {
  const list = values.filter((v) => v !== "Other");
  if (values.includes("Other")) list.push(other ? `Other: ${other}` : "Other");
  return list.join("; ");
}

export async function GET(request: NextRequest) {
  // proxy.ts already gates /portal/* and the (authed) layout gates the pages,
  // but a route handler is its own entry point — verify here too rather than
  // trusting the layer in front. The Ignite roster is Youth-ministry data
  // (minors' details): pastoral and Youth leads only.
  const pu = await getPortalUser();
  const isYouthLead = pu?.role === "lead" && pu.ministries.includes("Youth");
  if (!pu || (pu.role !== "pastoral" && !isYouthLead)) {
    return new NextResponse("Not authorized", { status: 403 });
  }

  const type = request.nextUrl.searchParams.get("type") === "youth" ? "youth" : "families";
  const families = await listIgniteFamilies(1000);
  const stamp = detroitDateIso();

  let csv: string;
  let filename: string;

  if (type === "youth") {
    filename = `ignite-youth-roster-${stamp}.csv`;
    csv = toCsv(
      [
        "Child",
        "Date of Birth",
        "Grade",
        "School",
        "T-Shirt Size",
        "Parent/Guardian",
        "Relationship",
        "Parent Phone",
        "Parent Email",
        "Interests",
        "Spiritual Needs",
        "Support Notes",
        "Health / Allergy / Accessibility",
        "Submitted",
      ],
      families.flatMap((f) =>
        f.ignite_children.map((c) => [
          c.full_name,
          c.date_of_birth,
          c.grade,
          c.school,
          c.tshirt_size,
          f.guardian_name,
          f.guardian_relationship,
          f.guardian_phone,
          f.guardian_email,
          c.interests,
          c.spiritual_needs,
          c.support_notes,
          c.health_notes,
          fmtDateTime(f.created_at),
        ]),
      ),
    );
  } else {
    filename = `ignite-families-${stamp}.csv`;
    csv = toCsv(
      [
        "Parent/Guardian",
        "Relationship",
        "Phone",
        "Email",
        "Preferred Contact",
        "Second Guardian",
        "Second Relationship",
        "Second Phone",
        "Second Email",
        "Children",
        "Child Names",
        "How can Ignite support you",
        "More of in 2027",
        "Wish we offered",
        "Could be improved",
        "Interested in helping",
        "Opportunity interests",
        "What would make it easier",
        "Anything else",
        "Submitted",
      ],
      families.map((f) => [
        f.guardian_name,
        f.guardian_relationship,
        f.guardian_phone,
        f.guardian_email,
        CONTACT_LABEL[f.contact_preference] ?? f.contact_preference,
        f.second_guardian_name,
        f.second_guardian_relationship,
        f.second_guardian_phone,
        f.second_guardian_email,
        f.ignite_children.length,
        f.ignite_children.map((c) => c.full_name).join("; "),
        f.support_parents,
        f.more_of_2027,
        f.wish_offered,
        f.could_improve,
        f.volunteer_interest ? VOLUNTEER_LABEL[f.volunteer_interest] : "",
        joinWithOther(f.volunteer_areas, f.volunteer_areas_other),
        joinWithOther(f.participation_helps, f.participation_helps_other),
        f.anything_else,
        fmtDateTime(f.created_at),
      ]),
    );
  }

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
