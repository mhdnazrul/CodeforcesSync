# Architecture

## Overview

CodeforcesSync is a Manifest V3 browser extension that bridges Codeforces solving activity with GitHub. It runs as a service worker in the background, polls Codeforces for accepted submissions, extracts source code from open Codeforces tabs, and uploads it to a user-specified GitHub repository.

The extension is built with TypeScript and React, bundled with Vite and the CRXJS plugin, and deploys a stateless OAuth broker on Vercel for GitHub authentication.

---

## Folder Structure

```
CodeforcesSync/
├── api/oauth/            # Vercel serverless functions — OAuth broker
├── docs/                 # Documentation
├── public/               # Static assets (icons, screenshots)
├── src/
│   ├── background/       # Service worker entry, scheduler, sync wiring, OAuth handler
│   ├── browser/          # Browser API abstraction layer
│   │   └── chrome/       # Chrome implementation of browser interfaces
│   ├── cfstats/          # Codeforces statistics fetcher (rating, rank, breakdown)
│   ├── codeforces/       # Codeforces API client, RSS feed parser, URL helpers
│   ├── content/          # Content scripts injected into Codeforces tabs
│   ├── github/           # GitHub REST API client, token management, file upload
│   ├── hooks/            # React hooks
│   ├── platform/         # Cross-browser API accessor (chrome vs browser)
│   ├── shared/           # Shared types, utilities, encoding, formatters
│   │   ├── types/        # TypeScript interfaces (browser, codeforces)
│   │   └── utils/        # Date, encoding, filename, language map helpers
│   ├── statistics/       # Streak calculation, weekly calendar computation
│   ├── storage/          # Settings persistence with schema versioning
│   ├── sync/             # Sync engine core — polling, dedup, retry, upload orchestration
│   └── ui/               # React popup application
│       ├── components/   # Reusable UI components
│       ├── contexts/     # React context (ApiContext)
│       ├── screens/      # Screen-level components
│       └── utils/        # UI utilities (error formatting, validation)
├── manifest.json           # Chrome MV3 manifest
├── manifest.firefox.json   # Firefox MV3 manifest
├── vite.config.ts          # Vite config (Chrome/Edge)
├── vite.config.firefox.ts  # Vite config (Firefox)
└── package.json
```

---

## Background Service Worker

**File:** `src/background/background.ts`

The service worker is the extension's central runtime. It is registered in both manifests as:

```
"background": { "service_worker": "src/background/background.ts" }
```

### Responsibilities

| Responsibility | Implementation |
|----------------|---------------|
| **OAuth flow** | PKCE-based GitHub OAuth via `browserApi.identity.launchWebAuthFlow()` |
| **Message routing** | Listens for `OAUTH_START`, `OAUTH_STATUS`, `VALIDATE_REPO`, `FETCH_CF_STATS` from the popup |
| **Sync orchestration** | Starts the scheduler; delegates to `runSyncWorker` on each alarm tick |
| **Credential management** | Holds a `GithubCredentialStore` that reads/writes tokens from storage |

### Lifecycle

1. Extension loads → service worker activates.
2. `startScheduler()` creates a `codeforces-sync` alarm with `periodInMinutes: 1`.
3. On each alarm tick, `runSyncWorker()` is called — it wires together tab queries, API fetches, source extraction, and file upload.
4. The worker stays alive via the alarm (MV3 keeps the worker alive for ~30s after an event; alarms fire every 60s, so the worker persists across ticks).
5. If the worker is idle, the browser may terminate it. It restarts on the next alarm or user interaction.

### Message Protocol

| Message Type | Direction | Purpose |
|-------------|-----------|---------|
| `OAUTH_START` | Popup → SW | Initiates PKCE OAuth flow |
| `OAUTH_COMPLETE` | SW → Popup | Signals OAuth success |
| `OAUTH_STATUS` | Popup → SW | Checks if user is authenticated |
| `VALIDATE_REPO` | Popup → SW | Validates GitHub repository exists and user has push access |
| `FETCH_CF_STATS` | Popup → SW | Fetches Codeforces statistics (rating, rank, breakdown) |
| `SYNC_SUCCESS` | SW → Popup | Signals a new submission was synced |
| `TOKEN_EXPIRED` | SW → Popup | Signals the GitHub token is invalid |

---

## Browser Abstraction Layer

**Files:** `src/platform/browser.ts`, `src/browser/`

The abstraction layer isolates the rest of the extension from direct `chrome.*` API calls, enabling Firefox compatibility without code changes.

### Layer Architecture

```
src/platform/browser.ts
  └── browserApi — selects `browser` (Firefox) or `chrome` (Chrome/Edge) at runtime
      └── src/browser/chrome/adapter.ts
          ├── ChromeStorageService  → chrome.storage.local
          ├── ChromeTabsService     → chrome.tabs
          ├── ChromeScriptingService → chrome.scripting
          ├── ChromeRuntimeService  → chrome.runtime
          └── ChromeAlarmsService   → chrome.alarms
```

- `browserApi` is typed as `typeof chrome` — Chrome's type definitions from `@types/chrome` serve as the canonical API surface.
- Firefox implements the same API surface via its `browser` global.
- Each service class implements a TypeScript interface from `src/shared/types/browser.ts` (e.g., `TabsService`, `StorageService`).
- No domain module (sync, github, codeforces, statistics) imports from `browser/` directly; interfaces are injected.

### Cross-Browser Differences Handled

| API | Chrome | Firefox | Adapter Handling |
|-----|--------|---------|-----------------|
| Alarms callback | `chrome.alarms.get(name, callback)` | `browser.alarms.get(name)` returns Promise | `adapter.ts:81-85` wraps callback API in Promise |
| Redirect URI | `chrome-extension://<id>/oauth-callback` | `https://<uuid>.extensions.allizom.org/oauth-callback` | `browserApi.identity.getRedirectURL()` returns correct format per browser |
| Identity API | `chrome.identity.getRedirectURL()` | `browser.identity.getRedirectURL()` | Both work via `browserApi` |
| Storage session | `chrome.storage.session` | `browser.storage.session` | Firefox 128+ required |

---

## OAuth Flow

**Files:** `src/background/background.ts` (lines 54-142), `api/oauth/`

The extension uses the **Authorization Code Grant with PKCE (S256)** flow, brokered through a stateless Vercel serverless function.

### Flow Diagram

```
Popup                    Service Worker                Vercel Broker              GitHub
  │                          │                             │                       │
  │──── OAUTH_START ────────►│                             │                       │
  │                          │                             │                       │
  │                          │── Generate PKCE params ──── │                       │
  │                          │   code_verifier (random)    │                       │
  │                          │   code_challenge = SHA256   │                       │
  │                          │   state (CSRF token)        │                       │
  │                          │                             │                       │
  │                          │── Store in session storage ─│                       │
  │                          │                             │                       │
  │                          │── launchWebAuthFlow(url) ──►│                       │
  │                          │                             │─── authorize ────────►│
  │                          │                             │◄──── login page ──────│
  │                          │                             │                       │
  │                          │◄──── callback with code ────│                       │
  │                          │                             │─── exchange code ────►│
  │                          │                             │◄──── access token ────│
  │                          │                             │                       │
  │                          │◄── redirect(token, state) ──│                       │
  │                          │                             │                       │
  │                          │── Verify CSRF state ────────│                       │
  │                          │── Save token to storage ────│                       │
  │                          │                             │                       │
  │◄── OAUTH_COMPLETE ──────│                             │                       │
```

### Security Measures

| Measure | Implementation |
|---------|---------------|
| PKCE S256 | `crypto.subtle.digest("SHA-256", ...)` computes code challenge |
| CSRF state | Random 16-byte hex, verified on callback |
| Redirect URI validation | Strict regex whitelist in `api/oauth/_utils.ts` — Chrome, Edge, Firefox patterns |
| Stateless broker | Vercel function never stores tokens; relays them directly in redirect URL |
| Session-scoped state | `code_verifier` and `state` stored in `storage.session` (cleared after flow) |

---

## Sync Engine

**File:** `src/sync/index.ts`

The sync engine is the core orchestration layer that polls Codeforces, processes new submissions, and uploads to GitHub.

### Sync Cycle

1. **Scheduler** (`src/background/scheduler.ts`) fires a `codeforces-sync` alarm every 60 seconds.
2. **Guard checks** — if a sync is already running or the engine is in backoff, the tick is skipped.
3. **Streak break check** — if the last accepted submission is older than 1 day, the streak resets to 0.
4. **Credential check** — if no GitHub token, repo, or CF handle is configured, the sync aborts.
5. **Tab discovery** — queries `*://*.codeforces.com/*` tabs to find an active CF session.
6. **Dual-tier fetch** — fetches submissions via Tier 1 (API) or Tier 2 (RSS fallback).
7. **Source extraction** — for each new accepted submission, extracts source code from the CF tab or opens a temporary tab.
8. **File upload** — uploads source to GitHub via PUT `/repos/{owner}/{repo}/contents/{path}`.
9. **Streak update** — computes and persists new streak values.
10. **Rate limiting** — 2500ms delay between uploads; exponential backoff on failure.

### Dual-Tier Submission Fetching

```
Tier 1 (Official API)
  └── Inject fetchSubmissions() into open CF tab
  └── Uses tab's session cookies (bypasses Cloudflare)
  └── Calls user.status API for up to 100,000 submissions
  └── On success → return submissions
  └── On failure → fall to Tier 2

Tier 2 (RSS Feed)
  └── Parses Codeforces RSS feed at /profile/{handle}/feed
  └── Returns metadata (contest ID, problem index, verdict, language)
  └── No source code available
  └── On failure → record backoff, skip tick
```

### Retry Engine

| Parameter | Value |
|-----------|-------|
| Max consecutive failures | 8 |
| Backoff base | 30 seconds |
| Backoff cap | 16 minutes |
| Backoff multiplier | 2x per failure (30s, 60s, 120s, ...) |

---

## Storage Layer

**File:** `src/storage/index.ts`

The storage module provides typed CRUD operations over `chrome.storage.local` with schema versioning for forward compatibility.

### Schema

```typescript
interface AppSettings {
  githubToken: string;
  githubUsername: string;
  githubRepo: string;
  useSubdirectory: boolean;
  subdirectoryName: string;
  currentStreak: number;
  bestStreak: number;
  lastAcceptedDate: string | null;
  codeforcesHandle: string;
  syncedSubmissions: string[];
  solvedDays: string[];
}
```

- **Schema version:** 1 (current).
- **Migration:** On read, if the stored version is less than `SCHEMA_VERSION`, the schema version is updated. No data transformation is needed for version 1.
- **Session storage** is used separately for OAuth ephemeral data (`oauthVerifier`, `oauthState`).
- **No encryption at rest** — standard for extension storage (only accessible by the extension's origin).

---

## UI Architecture

**Files:** `src/ui/`

The popup is a React application mounted in `index.html`. It communicates with the service worker via `browserApi.runtime.sendMessage`.

### Component Tree

```
<App> (src/App.tsx)
  └── <ApiProvider> (src/ui/contexts/ApiContext.tsx)
      └── <AppUI> (src/ui/App.tsx)
          ├── [onboarding flow]
          │   ├── <WelcomeScreen>
          │   ├── <GithubAuthScreen>
          │   ├── <CodeforcesAuthScreen>
          │   └── <RepositorySetupScreen>
          ├── [authenticated]
          │   ├── <DashboardScreen>
          │   └── <SettingsScreen>
          └── Shared components
              ├── <Button>, <Card>, <Input>, <Stepper>
              ├── <Header>, <Footer>
              └── <ErrorBoundary>
```

### State Management

- `ApiProvider` (React Context) holds all application state: settings, stats, Codeforces stats, loading states.
- Settings are read from `chrome.storage.local` via `createStore()` on mount.
- Real-time updates from the service worker (`SYNC_SUCCESS`, `TOKEN_EXPIRED`, `OAUTH_COMPLETE`) are received via `browserApi.runtime.onMessage` and refresh the store.
- Codeforces statistics are fetched on demand via `FETCH_CF_STATS` message and cached with a 10-minute TTL.

### Screens

| Screen | File | Purpose |
|--------|------|---------|
| Welcome | `screens/WelcomeScreen.tsx` | Onboarding entry point |
| GitHub Auth | `screens/GithubAuthScreen.tsx` | GitHub OAuth initiation with error handling |
| Codeforces Auth | `screens/CodeforcesAuthScreen.tsx` | CF handle input with optional DOM detection |
| Repository Setup | `screens/RepositorySetupScreen.tsx` | Repository URL with debounced validation |
| Dashboard | `screens/DashboardScreen.tsx` | Streak display, weekly calendar, CF stats |
| Settings | `screens/SettingsScreen.tsx` | Repository, subdirectory, data reset |

---

## Browser Compatibility

| Feature | Chrome | Edge | Firefox |
|---------|--------|------|---------|
| Minimum version | 102 | 102 | 128 |
| Manifest version | MV3 | MV3 | MV3 |
| Service worker | `chrome` API | `chrome` API | `browser` API |
| Storage session | `chrome.storage.session` | `chrome.storage.session` | `browser.storage.session` |
| Identity API | `chrome.identity` | `chrome.identity` | `browser.identity` |
| Scripting API | `chrome.scripting` | `chrome.scripting` | `browser.scripting` |
| Extension ID | Derived from RSA key in manifest | Derived from RSA key | Explicit `gecko.id` in manifest |
| Redirect URI format | `chrome-extension://<id>/...` | `chrome-extension://<id>/...` (same as Chrome) | `https://<uuid>.extensions.allizom.org/...` |

Firefox requires `browser_specific_settings.gecko.strict_min_version: "128.0"` and an explicit `id` in the manifest. The RSA public key in the Chrome manifest (`manifest.json:31`) is omitted in the Firefox manifest as Firefox does not use it.

---

## Data Flow

```
Codeforces Tab
    │
    ▼
Content Script (src/content/tier1Fetcher.ts)
    │  └── fetch() with credentials: "include" → Codeforces API
    │
    ▼
Service Worker (src/background/)
    │  ├── tier1Fetcher.ts — receives fetched submissions
    │  ├── sourceExtractor.ts — opens temp tab, extracts DOM source
    │  └── syncWorker.ts — wires everything together
    │
    ▼
Sync Engine (src/sync/index.ts)
    │  ├── Filters accepted submissions
    │  ├── Deduplicates against syncedSubmissions[]
    │  ├── Generates file path (problemId_name.ext)
    │  └── Calls upload
    │
    ▼
GitHub Handler (src/github/index.ts)
    │  └── PUT /repos/{owner}/{repo}/contents/{path}
    │       Authorization: Bearer {token}
    │
    ▼
User's GitHub Repository
```

### File Path Generation

Source files are saved as `{problemId}_{problemName}.{extension}`. If a subdirectory is configured (e.g., `solutions/`), the path becomes `solutions/{problemId}_{problemName}.{extension}`.

The language map (`src/shared/utils/languageMap.ts`) maps Codeforces language names to file extensions. Unrecognized languages fall back to `.txt`.

---

## Extension Lifecycle

### Installation

1. Extension is loaded as an unpacked extension.
2. Service worker starts and calls `startScheduler()`.
3. User opens the popup → onboarding wizard guides through OAuth, CF handle, repo setup.
4. After onboarding, the alarm fires every 60 seconds → sync begins.

### Runtime

- Service worker processes alarm events and user messages.
- Popup opens on toolbar click → reads settings from storage → renders dashboard.
- Content scripts are injected on demand (via `chrome.scripting.executeScript`), not declaratively.

### Uninstallation

- `chrome.extensions` → Remove → all extension storage (`local`, `session`) is deleted.
- GitHub token is invalidated on the user's GitHub settings page (not automatic).

---

## Key Design Decisions

1. **Dual-tier fetching** — Tier 1 uses the authenticated CF tab session to bypass Cloudflare. Tier 2 (RSS) is a read-only fallback that provides metadata but no source code.
2. **Stateless OAuth broker** — The Vercel middleware never stores tokens. It relays the access token directly to the extension's redirect URI, minimizing the server-side attack surface.
3. **Browser abstraction layer** — All `chrome.*` calls go through typed interfaces. Adding a new browser requires only implementing the interface.
4. **Schema versioning** — Storage reads include a version check, enabling non-breaking migrations in future updates.
5. **Exponential backoff** — The sync engine progressively backs off on repeated failures (2x up to 16 minutes), preventing hammering APIs when offline or rate-limited.
6. **No declarative content scripts** — Scripts are injected imperatively via `scripting.executeScript` to minimize the persistent permission surface.
