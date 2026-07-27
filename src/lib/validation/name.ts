/**
 * Person-name rules shared by the onboarding forms (guide + participant). A name may hold letters
 * of any language (accents, CJK, …) plus spaces, hyphens, apostrophes, and periods; it must contain
 * at least one letter and stay within {@link NAME_MAX_LENGTH} characters. Kept in step with the
 * server-side `NameRules` (backend) so the two never disagree.
 */
export const NAME_MAX_LENGTH = 50;

const DISALLOWED_CHARS = /[^\p{L} .'-]/gu;
const ALLOWED_NAME = /^[\p{L} .'-]+$/u;
const HAS_LETTER = /\p{L}/u;

/** Strip characters not allowed in a name and cap the length — for on-input filtering. */
export function sanitizeName(value: string): string {
  return value.replace(DISALLOWED_CHARS, "").slice(0, NAME_MAX_LENGTH);
}

/** react-hook-form `validate`: format + length (emptiness is handled by the `required` rule). */
export function validateName(value: string): true | string {
  if (!value) return true;
  const v = value.trim();
  if (!v) return true;
  if (v.length > NAME_MAX_LENGTH) return `Keep it to ${NAME_MAX_LENGTH} characters or fewer.`;
  if (!ALLOWED_NAME.test(v) || !HAS_LETTER.test(v)) {
    return "Only letters, spaces, hyphens, apostrophes, and periods.";
  }
  return true;
}
