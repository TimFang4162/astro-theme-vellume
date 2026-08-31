/**
 * Sanitize arbitrary text into a value safe to embed in a DOM id.
 * Collapses every run of non-id characters into a single hyphen.
 */
export function slugifyId(value: string) {
  return value.trim().replace(/[^a-zA-Z0-9_-]+/g, "-");
}
