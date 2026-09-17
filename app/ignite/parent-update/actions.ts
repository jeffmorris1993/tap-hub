"use server";

import { supabaseAdmin } from "../../../lib/supabase/server";
import { igniteParentFormOpen } from "../../../lib/ignite-form";
import { notifyIgniteTeam } from "../../../lib/email/ignite-parent";
import {
  CONTACT_PREFERENCES,
  MAX_CHILDREN,
  MAX_NAME,
  MAX_TEXT,
  PARTICIPATION_HELPS,
  VOLUNTEER_AREAS,
  VOLUNTEER_INTEREST,
  validateSubmission,
  type ParentUpdateSubmission,
} from "../../../lib/ignite-parent-form";

export type ParentUpdateResult =
  | { ok: true; guardianFirstName: string }
  | { ok: false; error: string };

const GENERIC_ERROR = "Something went wrong on our end. Try again in a moment.";

/** Trim and clamp free text so a pasted novel can't land in the database. */
function text(value: string | undefined, max = MAX_TEXT): string | null {
  const trimmed = (value ?? "").trim();
  if (!trimmed) return null;
  return trimmed.slice(0, max);
}

/** Same, but for fields the schema requires. */
function requiredText(value: string | undefined, max = MAX_TEXT): string {
  return (value ?? "").trim().slice(0, max);
}

/** Keep only values we published — never trust a client-supplied label. */
function whitelist(values: string[] | undefined, allowed: readonly string[]): string[] {
  if (!Array.isArray(values)) return [];
  return allowed.filter((option) => values.includes(option));
}

export async function submitParentUpdate(
  input: ParentUpdateSubmission,
): Promise<ParentUpdateResult> {
  // Re-check the window server-side. A tab left open overnight must not be
  // able to post after the form has closed.
  if (!igniteParentFormOpen()) {
    return {
      ok: false,
      error: "This form is now closed. Please reach out to Ignite leadership directly.",
    };
  }

  const problems = validateSubmission(input);
  if (problems.length > 0) {
    return { ok: false, error: problems[0] };
  }

  const contactPreference = CONTACT_PREFERENCES.find(
    (p) => p.value === input.contactPreference,
  )?.value;
  if (!contactPreference) {
    return { ok: false, error: "Pick how you'd like us to reach you." };
  }

  const volunteerInterest =
    VOLUNTEER_INTEREST.find((v) => v.value === input.volunteerInterest)?.value ?? null;
  const wantsDetail = volunteerInterest === "yes" || volunteerInterest === "maybe";

  // The follow-up checklists only exist when the parent said yes or maybe, so
  // drop anything a stale client sends alongside "not at this time".
  const volunteerAreas = wantsDetail
    ? whitelist(input.volunteerAreas, VOLUNTEER_AREAS)
    : [];
  const participationHelps = wantsDetail
    ? whitelist(input.participationHelps, PARTICIPATION_HELPS)
    : [];

  const children = (Array.isArray(input.children) ? input.children : []).slice(
    0,
    MAX_CHILDREN,
  );
  if (children.length === 0) {
    return { ok: false, error: "Add at least one child so we know who to plan for." };
  }

  const guardianName = requiredText(input.guardianName, MAX_NAME);
  const sb = supabaseAdmin();

  const { data: family, error: familyError } = await sb
    .from("ignite_families")
    .insert({
      guardian_name: guardianName,
      guardian_relationship: requiredText(input.guardianRelationship, MAX_NAME),
      guardian_phone: requiredText(input.guardianPhone, MAX_NAME),
      guardian_email: requiredText(input.guardianEmail, MAX_NAME).toLowerCase(),
      contact_preference: contactPreference,

      second_guardian_name: text(input.secondGuardianName, MAX_NAME),
      second_guardian_relationship: text(input.secondGuardianRelationship, MAX_NAME),
      second_guardian_phone: text(input.secondGuardianPhone, MAX_NAME),
      second_guardian_email: text(input.secondGuardianEmail, MAX_NAME)?.toLowerCase() ?? null,

      support_parents: text(input.supportParents),
      more_of_2027: text(input.moreOf2027),
      wish_offered: text(input.wishOffered),
      could_improve: text(input.couldImprove),

      volunteer_interest: volunteerInterest,
      volunteer_areas: volunteerAreas,
      volunteer_areas_other: volunteerAreas.includes("Other")
        ? text(input.volunteerAreasOther)
        : null,
      participation_helps: participationHelps,
      participation_helps_other: participationHelps.includes("Other")
        ? text(input.participationHelpsOther)
        : null,

      anything_else: text(input.anythingElse),
    })
    .select("id")
    .limit(1);

  if (familyError || !family?.[0]) {
    // Log the database error only — never the payload, which describes minors.
    console.error("[ignite-parent] family insert failed", familyError);
    return { ok: false, error: GENERIC_ERROR };
  }

  const familyId = family[0].id as string;

  const { error: childrenError } = await sb.from("ignite_children").insert(
    children.map((child, i) => ({
      family_id: familyId,
      sort_order: i,
      full_name: requiredText(child.fullName, MAX_NAME),
      date_of_birth: requiredText(child.dateOfBirth, 10),
      grade: requiredText(child.grade, MAX_NAME),
      school: text(child.school, MAX_NAME),
      tshirt_size: text(child.tshirtSize, MAX_NAME),
      interests: requiredText(child.interests),
      spiritual_needs: requiredText(child.spiritualNeeds),
      support_notes: text(child.supportNotes),
      health_notes: text(child.healthNotes),
    })),
  );

  if (childrenError) {
    console.error("[ignite-parent] children insert failed", childrenError);
    // supabase-js has no transactions, so undo the family row rather than
    // leaving a household with no children attached to it.
    const { error: cleanupError } = await sb
      .from("ignite_families")
      .delete()
      .eq("id", familyId);
    if (cleanupError) {
      console.error("[ignite-parent] rollback failed", cleanupError);
    }
    return { ok: false, error: GENERIC_ERROR };
  }

  await notifyIgniteTeam({
    guardianName,
    childCount: children.length,
    volunteerInterest: volunteerInterest ?? "",
  });

  const guardianFirstName = (guardianName.split(/\s+/)[0] ?? "friend").slice(0, 40);
  return { ok: true, guardianFirstName };
}
