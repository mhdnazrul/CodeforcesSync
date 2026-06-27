/** Cross-browser API accessor.
 *
 * Uses `browser` API (Firefox) if available, falls back to `chrome` (Chrome/Edge/Opera).
 * Typed as `typeof chrome` for full type safety via @types/chrome.
 */
export const browserApi: typeof chrome =
  (globalThis as { browser?: typeof chrome }).browser ??
  globalThis.chrome;
