# Phase 05: Statistics Extraction

**Status:** ✅ Complete

**Goal:** Extract streak calculation and calendar/calendar computation from `background.ts` and `App.tsx` into a dedicated `statistics/` pure-logic module. Clean up duplicate `toLocalDateString` copies in consumers (Phase 1 backlog).

## Files Created

| File | Contents |
|---|---|
| `src/statistics/index.ts` | `computeStreak()` — pure streak math; `getWeeklyProgress()` — pure calendar computation; `StreakResult`, `WeekDay` types |

## Files Modified

| File | Change |
|---|---|
| `src/background/background.ts` | Replaced inline `updateStreak()` (35 lines) with slim 12-line wrapper that calls `computeStreak()`; removed duplicate `toLocalDateString()`; added imports |
| `src/App.tsx` | Removed inline `DAYS`, `toLocalDateString()`, `getWeeklyProgress()` (~25 lines); added imports |

## Files Untouched

`src/storage/index.ts`, `src/utils/storage.ts`, `src/shared/types/browser.ts`, `src/browser/**`, `src/utils/githubAPI.ts`

## Design Decisions

- **Pure functions with optional date parameter:** Both `computeStreak()` and `getWeeklyProgress()` accept an optional `today: Date` parameter. In production it defaults to `new Date()`; in tests it can be injected for determinism.
- **`new*` prefix on `StreakResult` fields:** `newStreak`, `newLastAcceptedDate`, `updatedSolvedDays` prevent accidental spread into `saveSettings()`. Consumer explicitly maps fields, and TypeScript excess property checks block any extra keys.
- **No barrel file:** Single-file module; a barrel adds no value until the module grows.
- **Duplicates eliminated:** `toLocalDateString` now exists in exactly one canonical location (`shared/utils/date.ts`). Both `background.ts` and `App.tsx` import it.

## Acceptance Criteria

- `npx tsc -b --noEmit` passes
- `npm run lint` passes
- `npm run build` passes
- `npx madge --circular` reports no cycles
- All existing behaviour preserved (same streak logic, same calendar rendering)
