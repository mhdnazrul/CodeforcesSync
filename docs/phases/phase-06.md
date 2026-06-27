# Phase 06: Codeforces Module Extraction

**Status:** ✅ Complete

**Goal:** Extract Codeforces API, RSS/Atom parsing, and submission-related pure functions from `background.ts` into a dedicated `codeforces/` module.

## Files Created

| File | Contents |
|---|---|
| `src/codeforces/index.ts` | `RssEntry` interface, `generateSubmissionUrl()`, `parseRssEntries()` (pure core), `parseRssFeed()` (DOM wrapper), `fetchRssFeed()`, `isAcceptedSubmission()`, `getProblemId()`, `createApiUrl()` |

## Files Modified

| File | Change |
|---|---|
| `src/background/background.ts` | Removed 6 inline functions (~195 lines); replaced with imports from `codeforces/` and `shared/utils/encoding` |

## Files Untouched

`src/storage/`, `src/statistics/`, `src/shared/**`, `src/browser/**`, `src/App.tsx`, `src/utils/**`

## Design Decisions

- **Pure core + DOM wrapper split:** `parseRssEntries()` operates on `RssEntry[]` (plain strings) and is pure — testable in Node without `jsdom`. `parseRssFeed(xmlText)` is a thin DOM layer that extracts `RssEntry[]` and delegates to `parseRssEntries()`.
- **Standard Web APIs only:** `codeforces/` uses `fetch()` and `DOMParser` — Web standards, not Chrome-specific APIs. Complies with Constitution §2, §4.
- **Duplicate utility cleanup:** `unescapeHtml` and `utf8ToBase64` were duplicated in `background.ts` since Phase 1. Phase 6 removes both duplicates and imports the canonical versions from `shared/utils/encoding`.
- **5 small pure helpers extracted:** `isAcceptedSubmission()`, `getProblemId()`, `createApiUrl()` replace inline expressions in `syncSolutions()` — minimal extraction, maximal testability.

## Functions Moved

| Function | From | To | Type |
|---|---|---|---|
| `unescapeHtml` | `background.ts:45` (duplicate) | `shared/utils/encoding.ts` | Cleanup (canonical since Phase 1) |
| `generateSubmissionUrl` | `background.ts:56` | `codeforces/index.ts` | Pure |
| `parseRssFeed` | `background.ts:76` | `codeforces/index.ts` | DOM wrapper |
| `parseRssEntries` | (new) | `codeforces/index.ts` | Pure core (new) |
| `fetchRssFeed` | `background.ts:156` | `codeforces/index.ts` | Async (fetch + parse) |
| `utf8ToBase64` | `background.ts:317` (duplicate) | `shared/utils/encoding.ts` | Cleanup (canonical since Phase 1) |

## Functions That Stay in background.ts

| Function | Reason |
|---|---|
| `fetchSourceCode()` | Uses `chrome.tabs.*`, `chrome.scripting.*` |
| `fetchCodeforcesSubmissionsTier1()` | Uses `chrome.scripting.executeScript` |
| `fetchCodeforcesSubmissionsDualTier()` | Orchestrates Tier 1 + Tier 2 |
| `syncSolutions()` | Main orchestrator |
| `recordApiFailure()` / `recordApiSuccess()` | Retry state management |

## Acceptance Criteria

- `npx tsc -b --noEmit` passes
- `npm run lint` passes
- `npm run build` passes
- `npx madge --circular` reports no cycles
- All existing behaviour preserved (same URLs, same RSS regex, same submission processing)
