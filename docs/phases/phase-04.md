# Phase 04: Storage Abstraction

**Status:** ✅ Complete

**Goal:** Extract storage logic into a dedicated `storage/` module with schema versioning, using the `StorageService` interface from Phase 3. The old `utils/storage.ts` becomes a Strangler Fig bridge file.

## Files Created

| File | Contents |
|---|---|
| `src/storage/index.ts` | `AppSettings` interface, `defaultSettings`, `SCHEMA_VERSION`, `createStore(storage)` factory returning `{ getSettings, saveSettings, clearSettings }` |

## Files Modified

| File | Change |
|---|---|
| `src/utils/storage.ts` | Was 107-line direct `chrome.storage.local.*` implementation → now a 10-line bridge: wires `ChromeStorageService` → `createStore()` → re-exports |

## Files Untouched

`src/App.tsx`, `src/utils/githubAPI.ts`, `src/background/background.ts`, `src/shared/types/browser.ts`, `src/browser/chrome/adapter.ts`, `src/browser/chrome/index.ts`, `src/browser/index.ts`

## Design Decisions

- **Dependency Inversion via Bridge:** `storage/` depends only on `StorageService` interface from `shared/types/browser.ts`. The concrete `ChromeStorageService` is wired in the bridge file (`utils/storage.ts`), which is the Strangler Fig boundary. This avoids coupling `storage/` to `browser/chrome/`.
- **`createStore(storage)` Factory:** A pure function returning a plain object. No class, no module-level mutable state (§1.5, §1.6). Trivially testable with a mock `StorageService`.
- **Schema Versioning (minimal):** `SCHEMA_VERSION = 1` constant. On `getSettings`, if `schemaVersion` is missing, it's set and saved. On every `saveSettings`, `schemaVersion` is injected. Stripped from returned `AppSettings` — consumers never see it.
- **No migration function:** Deferred per YAGNI. At v1, there are zero pending migrations. The version-tracking infrastructure exists without routing logic.
- **Error messages preserved:** `CodeforcesSync:` prefix on all errors, identical wording to Phase 1–3 behaviour.

## Acceptance Criteria

- `npx tsc -b --noEmit` passes
- `npm run lint` passes
- `npm run build` passes
- `npx madge --circular` reports no cycles
- All 3 consumers (`App.tsx`, `background.ts`, `githubAPI.ts`) import from the same path as before
