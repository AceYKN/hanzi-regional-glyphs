export function readPreference(
  key: string,
  fallback: string,
  allowed: readonly string[],
): string {
  try {
    const value = localStorage.getItem(`hanglyph.${key}`);
    return value && allowed.includes(value) ? value : fallback;
  } catch {
    return fallback;
  }
}
export function savePreference(key: string, value: string): void {
  try {
    localStorage.setItem(`hanglyph.${key}`, value);
  } catch {
    /* Storage can be unavailable in privacy mode. */
  }
}
