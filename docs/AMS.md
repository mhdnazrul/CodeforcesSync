# Architecture Migration Specification

## CodeforcesSync — 12-Phase Migration Blueprint

**Strategy:** Strangler Fig Pattern — new code grows alongside old code. Old import paths are preserved via re-export wrappers until cleanup.

## Phases

| Phase | Description | Risk | Dependencies |
|---|---|---|---|
| **01** | Shared utilities — extract pure functions to `shared/utils/` | Very Low | None |
| **02** | Shared types — create `shared/types/` | Very Low | Phase 01 |
| **03** | Browser abstraction — create `browser/` interfaces + Chrome adapter | Low | Phase 02 |
| **04** | Storage abstraction — create `storage/` module with schema versioning | Low | Phase 03 |
| **05** | Statistics extraction — streak, calendar to `statistics/` | Low | Phase 01 |
| **06** | Codeforces module extraction — API, parser, submissions | Low | Phase 01, 03 |
| **07** | GitHub module extraction — auth, upload, repository ops | Medium | Phase 01, 03, 04 |
| **08** | Sync engine extraction — retry, queue, orchestrator | Low | Phase 05, 06, 07 |
| **09** | Background service split — scheduler, messageRouter, syncWorker | High | Phase 01-08 |
| **10** | Content script split — extract injected functions | Medium | Phase 09 |
| **11** | React component split — dashboard, settings, hooks | Medium | Phase 01, 04 |
| **12** | Cleanup — delete old files, final import updates | Medium | All prior phases |

## Principles

- Never break production (strangler fig pattern)
- Move code first, refactor later, optimize last
- Each phase produces a committable, shippable state
- Old files become re-export wrappers before deletion
- No feature development during migration
