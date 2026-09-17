/**
 * Shared shape + validation for the Ignite Youth parent/family update form.
 *
 * Deliberately isomorphic (no "server-only"): the client wizard imports it for
 * inline per-step validation and the Server Action imports it to re-validate
 * authoritatively, so there is exactly one definition of what "valid" means.
 * The option arrays are also the server's whitelist — submitted values are
 * checked against them rather than trusted.
 */

export const CONTACT_PREFERENCES = [
  { value: "text", label: "Text" },
  { value: "email", label: "Email" },
  { value: "flocknote", label: "Flocknote" },
  { value: "phone", label: "Phone Call" },
] as const;

export const VOLUNTEER_INTEREST = [
  { value: "yes", label: "Yes" },
  { value: "maybe", label: "Maybe, depending on the opportunity" },
  { value: "not_now", label: "Not at this time" },
] as const;

export const VOLUNTEER_AREAS = [
  "Events",
  "Food",
  "Setup / Cleanup",
  "Transportation",
  "Chaperoning",
  "Small Groups / Bible Teaching",
  "Children's Ministry",
  "Photography / Video / Social Media",
  "Fundraising",
  "Mentoring",
  "Prayer",
  "Administrative / Organizational Help",
  "One-Time Projects",
  "Other",
] as const;

export const PARTICIPATION_HELPS = [
  "Earlier notice",
  "Short-term opportunities instead of long commitments",
  "Clearer expectations",
  "Knowing where help is needed",
  "Opportunities matching my skills/interests",
  "Different meeting/event times",
  "Childcare",
  "Transportation",
  "Work/family schedule makes participation difficult",
  "I'm not sure how to get involved",
  "Other",
] as const;

/** Suggestions only — the field is a free-text input so nobody is boxed out. */
export const RELATIONSHIP_SUGGESTIONS = [
  "Mother",
  "Father",
  "Grandmother",
  "Grandfather",
  "Aunt",
  "Uncle",
  "Guardian",
  "Stepmother",
  "Stepfather",
];

export const GRADES = [
  "Pre-K",
  "Kindergarten",
  "1st",
  "2nd",
  "3rd",
  "4th",
  "5th",
  "6th",
  "7th",
  "8th",
  "9th",
  "10th",
  "11th",
  "12th",
  "Graduated",
];

export const TSHIRT_SIZES = [
  "Youth XS",
  "Youth S",
  "Youth M",
  "Youth L",
  "Youth XL",
  "Adult S",
  "Adult M",
  "Adult L",
  "Adult XL",
  "Adult 2XL",
  "Adult 3XL",
];

export const MAX_CHILDREN = 12;
export const MAX_TEXT = 4000;
export const MAX_NAME = 120;

export type ChildInput = {
  fullName: string;
  dateOfBirth: string;
  grade: string;
  school: string;
  tshirtSize: string;
  interests: string;
  spiritualNeeds: string;
  supportNotes: string;
  healthNotes: string;
};

export type ParentUpdateSubmission = {
  guardianName: string;
  guardianRelationship: string;
  guardianPhone: string;
  guardianEmail: string;
  contactPreference: string;

  secondGuardianName: string;
  secondGuardianRelationship: string;
  secondGuardianPhone: string;
  secondGuardianEmail: string;

  children: ChildInput[];

  supportParents: string;
  moreOf2027: string;
  wishOffered: string;
  couldImprove: string;

  volunteerInterest: string;
  volunteerAreas: string[];
  volunteerAreasOther: string;
  participationHelps: string[];
  participationHelpsOther: string;

  anythingElse: string;
};

export function emptyChild(): ChildInput {
  return {
    fullName: "",
    dateOfBirth: "",
    grade: "",
    school: "",
    tshirtSize: "",
    interests: "",
    spiritualNeeds: "",
    supportNotes: "",
    healthNotes: "",
  };
}

export function emptySubmission(): ParentUpdateSubmission {
  return {
    guardianName: "",
    guardianRelationship: "",
    guardianPhone: "",
    guardianEmail: "",
    contactPreference: "",
    secondGuardianName: "",
    secondGuardianRelationship: "",
    secondGuardianPhone: "",
    secondGuardianEmail: "",
    children: [],
    supportParents: "",
    moreOf2027: "",
    wishOffered: "",
    couldImprove: "",
    volunteerInterest: "",
    volunteerAreas: [],
    volunteerAreasOther: "",
    participationHelps: [],
    participationHelpsOther: "",
    anythingElse: "",
  };
}

/** Loose on purpose — we want to catch typos, not police valid addresses. */
export function looksLikeEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value.trim());
}

/** Accepts anything with at least 10 digits, so (248) 555-0123 and +1… both pass. */
export function looksLikePhone(value: string): boolean {
  return (value.match(/\d/g) ?? []).length >= 10;
}

export type FieldErrors = Record<string, string>;

/** Validates one child record. Keys match the ChildInput field names. */
export function validateChild(child: ChildInput): FieldErrors {
  const errors: FieldErrors = {};
  if (!child.fullName.trim()) errors.fullName = "Please enter this child's name.";
  if (!child.dateOfBirth.trim()) {
    errors.dateOfBirth = "Please enter a date of birth.";
  } else if (!/^\d{4}-\d{2}-\d{2}$/.test(child.dateOfBirth.trim())) {
    errors.dateOfBirth = "Please use the date picker.";
  } else {
    const year = Number(child.dateOfBirth.slice(0, 4));
    if (year < 1990 || year > 2030) errors.dateOfBirth = "That date doesn't look right.";
  }
  if (!child.grade.trim()) errors.grade = "Please choose a grade.";
  if (!child.interests.trim()) errors.interests = "Tell us a little about what they enjoy.";
  if (!child.spiritualNeeds.trim()) {
    errors.spiritualNeeds = "Your answer here helps us plan — even a sentence is plenty.";
  }
  return errors;
}

/**
 * Per-step validation for the wizard. Steps are 0-indexed and match the order
 * in ParentUpdateForm: 0 guardians, 1 children, 2 family feedback,
 * 3 involvement, 4 final. Steps 2 and 4 are entirely optional.
 */
export function validateStep(step: number, input: ParentUpdateSubmission): FieldErrors {
  const errors: FieldErrors = {};

  if (step === 0) {
    if (!input.guardianName.trim()) errors.guardianName = "Please enter your name.";
    if (!input.guardianRelationship.trim()) {
      errors.guardianRelationship = "How are you related to your child or children?";
    }
    if (!input.guardianPhone.trim()) {
      errors.guardianPhone = "Please enter a phone number.";
    } else if (!looksLikePhone(input.guardianPhone)) {
      errors.guardianPhone = "That phone number looks incomplete.";
    }
    if (!input.guardianEmail.trim()) {
      errors.guardianEmail = "Please enter an email address.";
    } else if (!looksLikeEmail(input.guardianEmail)) {
      errors.guardianEmail = "Please check this email address.";
    }
    if (!input.contactPreference) {
      errors.contactPreference = "Pick how you'd like us to reach you.";
    }
    // The second guardian is optional, but if a contact is given it should work.
    if (input.secondGuardianEmail.trim() && !looksLikeEmail(input.secondGuardianEmail)) {
      errors.secondGuardianEmail = "Please check this email address.";
    }
    if (input.secondGuardianPhone.trim() && !looksLikePhone(input.secondGuardianPhone)) {
      errors.secondGuardianPhone = "That phone number looks incomplete.";
    }
  }

  if (step === 1) {
    if (input.children.length === 0) {
      errors.children = "Add at least one child so we know who to plan for.";
    } else if (input.children.length > MAX_CHILDREN) {
      errors.children = `Please add no more than ${MAX_CHILDREN} children.`;
    } else {
      const bad = input.children.findIndex((c) => Object.keys(validateChild(c)).length > 0);
      if (bad >= 0) {
        const name = input.children[bad].fullName.trim();
        errors.children = name
          ? `${name}'s information is incomplete.`
          : "One of the children is missing some information.";
      }
    }
  }

  if (step === 3) {
    const wantsDetail =
      input.volunteerInterest === "yes" || input.volunteerInterest === "maybe";
    if (wantsDetail && input.volunteerAreas.includes("Other") && !input.volunteerAreasOther.trim()) {
      errors.volunteerAreasOther = "Tell us what you had in mind.";
    }
    if (
      wantsDetail &&
      input.participationHelps.includes("Other") &&
      !input.participationHelpsOther.trim()
    ) {
      errors.participationHelpsOther = "Tell us what would help.";
    }
  }

  return errors;
}

/**
 * Authoritative whole-submission check, re-run in the Server Action. Returns a
 * list of human-readable problems; empty means good.
 */
export function validateSubmission(input: ParentUpdateSubmission): string[] {
  const problems: string[] = [];

  for (const step of [0, 1, 3]) {
    const errors = validateStep(step, input);
    problems.push(...Object.values(errors));
  }

  if (
    input.contactPreference &&
    !CONTACT_PREFERENCES.some((p) => p.value === input.contactPreference)
  ) {
    problems.push("That contact preference isn't one we recognize.");
  }
  if (
    input.volunteerInterest &&
    !VOLUNTEER_INTEREST.some((v) => v.value === input.volunteerInterest)
  ) {
    problems.push("That volunteer answer isn't one we recognize.");
  }

  return problems;
}
