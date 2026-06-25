# Phase 01: Shared Utilities Extraction

**Status:** Pending

**Goal:** Extract all pure utility functions into `src/shared/utils/`. Create the canonical `toLocalDateString` to eliminate duplication.

## Files to Create

| File | Source |
|---|---|
| `src/shared/utils/date.ts` | `toLocalDateString` from `background.ts` and `App.tsx` |
| `src/shared/utils/encoding.ts` | `unescapeHtml`, `utf8ToBase64` from `background.ts` |
| `src/shared/utils/formatters.ts` | Move from `src/utils/formatters.ts` |
| `src/shared/utils/languageMap.ts` | Move from `src/utils/languageMap.ts` |
| `src/shared/utils/index.ts` | Barrel re-export |

## Files to Modify

| File | Change |
|---|---|
| `src/utils/formatters.ts` | Replace with `export * from "../shared/utils/formatters"` |
| `src/utils/languageMap.ts` | Replace with `export * from "../shared/utils/languageMap"` |

## Acceptance Criteria

- `npx tsc -b` passes
- `npm run lint` passes
- All existing imports from old paths still resolve
- Extension loads and syncs correctly

## Risks

- **Very Low** — additive only with re-export wrappers preserving old imports
- Pre-existing CRXJS build error does not affect Phase 1

## Dependencies

None (first phase).
