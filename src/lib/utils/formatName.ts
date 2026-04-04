/**
 * Capitalizes the first letter of each word in a string.
 * Used for auto-capitalizing name and alias inputs as the user types.
 *
 * Examples:
 *   "john d"    → "John D"
 *   "jane doe"  → "Jane Doe"
 *   "JOHN"      → "JOHN" (existing caps are not changed)
 */
export function capitalizeWords(value: string): string {
  return value.replace(/(?<=^|\s)\S/g, (char) => char.toUpperCase())
}
