# Phase 03: Browser API Abstraction

**Status:** ✅ Complete

**Goal:** Create the `browser/` module with service interfaces and Chrome adapter implementations. No consumers are updated — this is a pure addition phase.

## Files Created

| File | Contents |
|---|---|
| `src/shared/types/browser.ts` | `Tab`, `Alarm` type aliases; `StorageService`, `TabsService`, `ScriptingService`, `RuntimeService`, `AlarmsService` interfaces |
| `src/browser/chrome/adapter.ts` | 5 Chrome implementation classes |
| `src/browser/chrome/index.ts` | Barrel re-export for chrome adapter |
| `src/browser/index.ts` | Barrel re-export for browser module |

## Design Decisions

- **Composition over God-object:** 5 independent service interfaces instead of a `BrowserAdapter` wrapper class. Consumers inject only the services they need.
- **Interfaces in `shared/types/`:** Service interfaces live in `shared/types/browser.ts` so domain modules (github/, sync/, etc.) can import them (per Constitution §2-3).
- **`runtime.lastError` eliminated:** The adapter uses Promise-based variants of Chrome APIs where available; errors become Promise rejections.
- **`sender` and `sendResponse` excluded:** The extension uses fire-and-forget messaging only — no request-response pattern.
- **No generics:** Postponed until Phase 4 (storage) or Phase 9 (background) creates real generic consumers.
- **Classes for adapters:** Explicit `implements` contract ensures compiler-enforced interface compliance.

## Files Modified

None — pure addition phase.

## Acceptance Criteria

- `npx tsc -b` passes
- `npm run lint` passes
- `npm run build` passes
- `npx madge --circular` reports no cycles
- No existing files were modified
