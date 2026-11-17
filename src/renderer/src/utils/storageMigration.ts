/**
 * Reads a string from localStorage at `key`. If absent, checks `legacyKey`,
 * copies the value over to `key`, and removes `legacyKey` so migrations run once.
 */
export function readMigratedStorage(key: string, legacyKey: string): string | null {
  if (typeof window === 'undefined') return null;
  try {
    const current = localStorage.getItem(key);
    if (current !== null) return current;

    const legacy = localStorage.getItem(legacyKey);
    if (legacy !== null) {
      localStorage.setItem(key, legacy);
      localStorage.removeItem(legacyKey);
      return legacy;
    }
  } catch {
    // Ignore storage access errors in restricted environments
  }
  return null;
}
