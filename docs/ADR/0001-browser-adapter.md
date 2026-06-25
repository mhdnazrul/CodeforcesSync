# ADR-0001: Browser API Abstraction via BrowserAdapter

**Status:** Accepted

**Date:** 2026-06-26

**Deciders:** @mhdnazrul

## Context

The extension currently calls `chrome.*` APIs directly from `src/background/background.ts`, `src/App.tsx`, `src/utils/storage.ts`, and `src/utils/githubAPI.ts`. This creates tight coupling to the Chrome Extension API surface and prevents:

- Portability to Firefox (which uses `browser.*` instead of `chrome.*`)
- Unit testing business logic without a browser runtime
- Future migration to Manifest V4 or other browser platforms (Safari, Edge)

## Decision

Introduce a `BrowserAdapter` interface in `src/browser/types.ts` that abstracts every browser API the extension uses:

- `BrowserStorage` — wraps `chrome.storage.local`
- `BrowserTabs` — wraps `chrome.tabs`
- `BrowserScripting` — wraps `chrome.scripting`
- `BrowserAlarms` — wraps `chrome.alarms`
- `BrowserRuntime` — wraps `chrome.runtime`

A `ChromeAdapter` implementation lives in `src/browser/chrome/adapter.ts`. Business logic modules receive adapter instances via constructor injection — they never reference `chrome.*` directly.

## Consequences

**Easier:** Firefox support (write `FirefoxAdapter`), unit testing (use `MockAdapter`), platform migration.

**Harder:** Slightly more indirection; all existing `chrome.*` calls must be migrated incrementally.

**Trade-off:** The adapter interfaces are designed for current usage — they may need extension as new `chrome.*` APIs are used.

## Alternatives Considered

- **`webextension-polyfill`:** Third-party dependency that may lag API support. Also, it doesn't make testing easier since you still need a browser environment for the polyfill.
- **Direct `chrome.*` calls everywhere:** Simple but blocks Firefox support entirely.
