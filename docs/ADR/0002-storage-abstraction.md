# ADR-0002: Storage Abstraction with Schema Versioning

**Status:** Accepted

**Date:** 2026-06-26

**Deciders:** @mhdnazrul

## Context

The current `src/utils/storage.ts` directly wraps `chrome.storage.local` without versioning. As the `AppSettings` interface evolves with new fields (OAuth tokens, theme preferences, sync history), there is no mechanism to migrate user data between schema versions.

## Decision

Create `src/storage/` with three files:

- `schema.ts` — `AppSettings` interface with `schemaVersion: number` field (starts at 1)
- `storage.ts` — CRUD operations that use `BrowserStorage` adapter and run migrations before returning data
- `migrations.ts` — Version-based migration functions, called in order on read

The storage module is the single point of contact for all persistent data. Domain modules never directly access browser storage.

## Consequences

**Easier:** Safe schema evolution, centralized storage access, migration path for future features.

**Harder:** Slightly more code than direct `chrome.storage.local` calls.

**Trade-off:** Migrations add complexity that is only needed when the schema changes. The migration runner is empty until a v2 schema is introduced.

## Alternatives Considered

- **No versioning:** Simple but risky — data corruption on future schema changes.
- **`chrome.storage.sync` instead of `local`:** Cross-device sync would be nice but adds quota limitations (100KB vs 10MB).
