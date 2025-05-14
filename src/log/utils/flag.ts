/**
 * Utility function to extract boolean flag values from various formats.
 * Used to standardize how boolean flags are handled across the logging system.
 *
 * @param flag - The flag value which can be a boolean, an object with an enabled property, or undefined
 * @param defaultValue - The default value to use if flag is undefined or doesn't have an enabled property
 * @returns A single boolean value
 */
export function isEnabled(
  flag: boolean | { enabled?: boolean } | undefined,
  defaultValue = true
): boolean {
  if (typeof flag === 'boolean') return flag
  if (flag && typeof flag.enabled === 'boolean') return flag.enabled
  return defaultValue
}
