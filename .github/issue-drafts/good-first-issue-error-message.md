---
name: "Good First Issue: Improve error message when Codeforces API is unreachable"
about: "A beginner-friendly task to make API errors more actionable for users."
title: "[Good First Issue] Improve error message when Codeforces API is unreachable"
labels: ["good first issue", "enhancement"]
---

## Description

When the Codeforces API returns an error or times out, the dashboard shows "Failed to fetch statistics." This is not helpful for debugging — users don't know whether the issue is their network, a Codeforces outage, or an incorrect handle.

## Task

1. Locate the error handling in `src/cfstats/index.ts` around lines 117–128 and lines 219–248.
2. Improve the error messages to distinguish between:
   - Network error (no internet / DNS failure)
   - HTTP error (API returned 4xx/5xx with a comment)
   - Timeout (request exceeded 15 seconds)
   - Parse error (invalid JSON response)
3. Preserve the existing fallback-to-cache behavior — stale cached data should still be served on failure.
4. Update the user-facing error string so the dashboard displays a more specific message.

## Acceptance Criteria

- [ ] Network timeouts show "Codeforces API request timed out. Check your connection."
- [ ] HTTP errors include the API comment when available.
- [ ] Stale cache fallback still works (logs a warning but serves cached data).
- [ ] `npm run lint` and `npm run build` pass.

## Resources

- The API fetch logic is in `src/cfstats/index.ts`.
- The error surfaces in `src/ui/contexts/ApiContext.tsx` via `cfStatsError` state.
