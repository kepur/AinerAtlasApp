/** Inclusive gender identity options (i18n keys under settings.gender.*). */
export const GENDER_IDENTITY_OPTIONS = [
  "prefer_not_to_say",
  "woman",
  "man",
  "non_binary",
  "genderfluid",
  "agender",
  "trans_woman",
  "trans_man",
  "two_spirit",
  "self_describe",
] as const;

export type GenderIdentity = (typeof GENDER_IDENTITY_OPTIONS)[number];

/** Inclusive sexual orientation options (i18n keys under settings.orientation.*). */
export const SEXUAL_ORIENTATION_OPTIONS = [
  "prefer_not_to_say",
  "straight",
  "gay",
  "lesbian",
  "bisexual",
  "pansexual",
  "asexual",
  "demisexual",
  "queer",
  "questioning",
  "self_describe",
] as const;

export type SexualOrientation = (typeof SEXUAL_ORIENTATION_OPTIONS)[number];

export function computeAgeFromBirthday(birthday?: string | null): number | null {
  if (!birthday) return null;
  const born = new Date(birthday);
  if (Number.isNaN(born.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - born.getFullYear();
  const monthDiff = today.getMonth() - born.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < born.getDate())) {
    age -= 1;
  }
  return age >= 0 ? age : null;
}

export function maxBirthdayDate(): string {
  const d = new Date();
  d.setFullYear(d.getFullYear() - 13);
  return d.toISOString().slice(0, 10);
}

export function minBirthdayDate(): string {
  const d = new Date();
  d.setFullYear(d.getFullYear() - 120);
  return d.toISOString().slice(0, 10);
}
