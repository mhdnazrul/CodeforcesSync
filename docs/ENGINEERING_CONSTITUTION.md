# Engineering Constitution — CodeforcesSync

**Version 1.0.0**

This document is the governing rulebook for all development on the CodeforcesSync project. It applies to every human contributor and every AI tool operating on the codebase.

## 1. Core Principles

1.1 **Never break production** — Every commit must preserve existing sync, upload, streak, and detection behavior.

1.2 **Small incremental changes** — One commit does one thing.

1.3 **Backward compatibility first** — Old import paths must resolve until Phase 12 cleanup.

1.4 **One responsibility per module** — A module does one thing.

1.5 **Simplicity over cleverness** — Code must be understandable by a junior developer.

1.6 **Pure functions whenever possible** — Side effects pushed to edges of the system.

1.7 **Strangler Fig for all migrations** — New code grows alongside old code.

## 2. Folder Responsibility Rules

See `docs/ARCHITECTURE.md` for the complete folder responsibility matrix. Key rules:

- `github/`, `codeforces/`, `sync/`, `statistics/` — must not import from `browser/` or React
- `background/` — must not contain pure business logic
- `shared/` — must not import from domain modules
- `browser/` — only module that may call `chrome.*` directly

## 3. Dependency Rules

Domain modules may import from `shared/` and `storage/` (interfaces only). No cross-domain imports between `github/` and `codeforces/`. The dependency graph is a DAG — verified by `madge --circular src/` before every merge.

## 4. Browser API Rules

All `chrome.*` calls must go through `BrowserAdapter` interfaces in `browser/`. Direct `chrome.*` is only allowed in `browser/chrome/` adapter files. Never in domain modules.

## 5. React Rules

- Max component file: 200 lines
- Max hook file: 80 lines
- Business logic never lives inside components
- Custom hooks encapsulate browser API access
- Context only for data consumed by 3+ components at different nesting levels

## 6. TypeScript Rules

- `noUnusedLocals: true`, `noUnusedParameters: true`, `strict: true`
- `any` is forbidden — use `unknown` + type guards
- Prefer `interface` for public APIs and props
- Prefer discriminated unions for message types and API responses

## 7. Testing Rules

| Module | Minimum Coverage |
|---|---|
| `shared/utils/` | 95% |
| `codeforces/` | 90% |
| `statistics/` | 95% |
| `sync/` | 85% |
| `github/` | 80% |
| `storage/` | 90% |

## 8. Error Handling

Never swallow errors in empty `catch` blocks. All errors must be logged with `CodeforcesSync:` prefix. Network errors from GitHub API return structured objects. Storage errors use typed error with `cause` property.

## 9. Security

- GitHub tokens never logged, displayed in plaintext, or sent to third parties
- Token input uses `type="password"`
- No `dangerouslySetInnerHTML`, `eval()`, or `new Function()`
- Minimal manifest permissions — only what is actively used

## 10. Git Workflow

- Branch: `{type}/{phase-number}-{description}` (e.g., `phase/01-shared-utilities`)
- Commit: `{phase-number} {imperative-verb} {what}` (e.g., `01 Extract shared utilities module`)
- One phase = one committable unit
- PR must pass: build, lint, types, tests, circular dependency check

## 11. AI Development Rules

**AI must never:** rewrite the project, rename folders without approval, change architecture, change public interfaces, change algorithms, optimize working code, introduce new dependencies, remove comments or TODOs.

**AI may:** extract code, split files, improve readability, add documentation, add tests, fix bugs, improve type safety.

## 12. Definition of Done

A task is complete only when: build passes, lint passes, types pass, tests pass, existing behavior unchanged, no architecture violations, documentation updated.

---

*Last updated: 2026-06-26*
