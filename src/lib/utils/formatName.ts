/**
 * Normalizes a name-like string into title/sentence case while preserving
 * spaces, apostrophes, and hyphens.
 *
 * Examples:
 *   "john d"           → "John D"
 *   "jane DOE"         → "Jane Doe"
 *   "o'bRIEN"          → "O'Brien"
 *   "mary-jANE smith"  → "Mary-Jane Smith"
 */
export function capitalizeWords(value: string): string {
  return value
    .toLowerCase()
    .split(/([\s'’-]+)/)
    .map((segment) => {
      if (!segment || /[\s'’-]+/.test(segment)) return segment
      return segment.charAt(0).toUpperCase() + segment.slice(1)
    })
    .join('')
}
