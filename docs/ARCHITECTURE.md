# CodeforcesSync Architecture

## Project Overview

CodeforcesSync is a browser extension that automatically detects accepted Codeforces submissions and pushes the solution to a GitHub repository. It also tracks daily solving streaks.

**Tech Stack:** React 19, TypeScript, Vite 8, Tailwind CSS v4, CRXJS, Chrome Extension MV3, GitHub REST API, Codeforces API

---

## Module Structure

```
src/
├── app/                    # React application root
├── background/             # Service worker lifecycle, alarm scheduling, sync loop
├── content/                # Injected scripts for Codeforces page interaction
├── browser/                # Browser API abstraction layer (Chrome / Firefox adapters)
├── github/                 # GitHub REST API, token management, file upload
├── codeforces/             # Codeforces API, RSS parsing, source extraction
├── sync/                   # Sync engine, submission queue, retry, history
├── storage/                # Settings schema, storage service, migrations
├── statistics/             # Streak math, calendar computation
├── dashboard/              # Popup UI — main dashboard view
├── settings/               # Popup UI — settings forms
├── onboarding/             # Setup wizard (future)
├── shared/                 # Utilities, hooks, icons, types, UI components
└── assets/                 # Static icons and images
```

## Folder Responsibilities

| Folder | Responsibility | Browser-Agnostic |
|---|---|---|
| `app/` | React root, providers, constants | Yes |
| `background/` | Service worker lifecycle, alarms, message routing | No (uses `browser/`) |
| `content/` | Content scripts injected into Codeforces pages | No (uses `browser/`) |
| `browser/` | Abstracts all `chrome.*` APIs behind typed interfaces | N/A (implements adapters) |
| `github/` | GitHub REST API, token management, upload | Yes (pure logic) |
| `codeforces/` | Codeforces API, RSS parsing, source URLs | Yes (pure logic) |
| `sync/` | Sync engine, queue, retry, history | Yes (pure logic) |
| `storage/` | Schema, CRUD, migrations | No (uses `browser/`) |
| `statistics/` | Streak calculation, calendar | Yes (pure functions) |
| `dashboard/` | Main popup view components | No (uses `shared/hooks`) |
| `settings/` | Settings form components | No (uses `shared/hooks`) |
| `shared/` | Utilities, hooks, icons, types, UI | Mostly yes |

## Dependency Rules

Domain modules (`github/`, `codeforces/`, `sync/`, `statistics/`) must never import from `browser/`, `background/`, `content/`, or any React module. They are pure TypeScript testable in Node.

The `browser/` layer is the only module that directly calls `chrome.*` APIs. All other modules access browser capabilities through `BrowserAdapter` interfaces.

## Data Flow

```
Alarm fires → scheduler.ts
  → syncWorker.ts
    → storage/ (load settings)
    → codeforces/submissions.ts (dual-tier fetch)
      → Tier 1: content/codeforces.ts (injected fetch via CF session)
      → Tier 2: codeforces/parser.ts (RSS/Atom feed)
    → sync/queue.ts (deduplication)
    → content/sourceExtractor.ts (DOM extraction)
    → github/uploader.ts (GitHub Contents API)
    → statistics/streak.ts (streak update)
    → storage/ (save state)
```

## Browser Abstraction

All browser APIs are accessed through `BrowserAdapter` interfaces defined in `src/browser/types.ts`:

```ts
interface BrowserAdapter {
  storage: BrowserStorage;
  tabs: BrowserTabs;
  scripting: BrowserScripting;
  alarms: BrowserAlarms;
  runtime: BrowserRuntime;
}
```

Chrome implements these via `chrome.*`. Firefox (future) implements them via `browser.*`. Unit tests use mock implementations.
