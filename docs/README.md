# CodeforcesSync Documentation

Architecture and engineering reference for the CodeforcesSync browser extension.

## Documents

| Document | Description |
|---|---|
| [ARCHITECTURE.md](ARCHITECTURE.md) | Module design, folder responsibilities, dependency rules, data flow diagrams, browser abstraction layer |
| [AMS.md](AMS.md) | Architecture Migration Specification — 12-phase plan for migrating to the new architecture |
| [ENGINEERING_CONSTITUTION.md](ENGINEERING_CONSTITUTION.md) | Project rules and standards for human and AI contributors |

## Architecture Decision Records

| ADR | Decision |
|---|---|
| [ADR/0001-browser-adapter.md](ADR/0001-browser-adapter.md) | Browser API abstraction via `BrowserAdapter` interface |
| [ADR/0002-storage-abstraction.md](ADR/0002-storage-abstraction.md) | Storage module with schema versioning and migrations |

## Migration Phases

| Phase | Status | Description |
|---|---|---|
| [Phase 01](phases/phase-01.md) | Pending | Shared utilities extraction |
| Phase 02 | ✅ Complete | Shared types |
| Phase 03 | ✅ Complete | Browser abstraction |
| Phase 03 | Planned | Browser abstraction |
| Phase 04 | Planned | Storage abstraction |
| Phase 05 | Planned | Statistics module |
| Phase 06 | Planned | Codeforces module |
| Phase 07 | Planned | GitHub module |
| Phase 08 | Planned | Sync engine |
| Phase 09 | Planned | Background service split |
| Phase 10 | Planned | Content script split |
| Phase 11 | Planned | React component split |
| Phase 12 | Planned | Cleanup |

## Directories

- `ADR/` — Architecture Decision Records
- `phases/` — Per-phase execution plans
- `decisions/` — Future design decisions
- `diagrams/` — Architecture diagrams
- `changelog/` — Release changelogs
