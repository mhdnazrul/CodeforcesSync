# Phase 02: Shared Types Extraction

**Status:** ✅ Complete

**Goal:** Extract Codeforces domain types (`Submission`, `CfProblem`) into `src/shared/types/`.

## Files Created

| File | Source |
|---|---|
| `src/shared/types/codeforces.ts` | `CfProblem` and `Submission` from `background.ts` |

## Files Modified

| File | Change |
|---|---|
| `src/background/background.ts` | Remove local `CfProblem` + `Submission` interfaces; add `import type { Submission }` from new location |

## Acceptance Criteria

- `npx tsc -b` passes
- `npm run lint` passes
- `npm run build` passes
- `npx madge --circular src/main.tsx src/background/background.ts` reports no cycles
- All existing references to `Submission` (8+) continue to resolve through the new import

## Notes

- Barrel file (`src/shared/types/index.ts`) postponed until Phase 6 or Phase 8 creates a real consumer
- `CfProblem` not directly imported by `background.ts` — accessed transitively through `Submission.problem`
