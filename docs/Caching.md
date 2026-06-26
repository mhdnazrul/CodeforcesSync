# Caching Strategy

CodeforcesSync uses client-side caching to reduce API calls and improve performance. This document describes the caching behavior across the system.

## Codeforces Statistics Cache

### What Is Cached

Codeforces user statistics (rating, rank, total problems solved, contributions, friend count).

### Cache Configuration

| Parameter | Value |
|-----------|-------|
| **TTL** | 10 minutes |
| **Storage** | In-memory (service worker) + `chrome.storage.local` |
| **Invalidation** | Manual refresh, extension restart |

### How It Works

1. When the dashboard loads, the popup sends a `FETCH_CF_STATS` message to the service worker.
2. The service worker checks if cached stats exist and are still valid (within 10-minute TTL).
3. If cached and valid → returns cached data.
4. If not cached or expired → fetches from Codeforces API, caches the result, returns it.
5. The user can manually refresh by clicking a refresh button in the dashboard.

### Cache Invalidation

- **Time-based:** Stats expire after 10 minutes.
- **Manual:** The user can click "Refresh" in the dashboard to force a new fetch.
- **Extension restart:** Cache is cleared when the service worker restarts.

## Sync State

The sync engine persists state to `chrome.storage.local` after every cycle:

| Data | Purpose | Persistence |
|------|---------|-------------|
| `syncedSubmissions` | Deduplication — prevents re-syncing | Permanent |
| `currentStreak` | Streak display | Permanent |
| `bestStreak` | Streak display | Permanent |
| `solvedDays` | Calendar computation | Permanent |
| `lastSyncTimestamp` | Sync timing | Permanent |

This state persists across browser restarts and service worker terminations.

## API Throttling

### Codeforces API

- The extension polls `user.status` every **60 seconds**.
- No explicit rate limit handling — Codeforces allows up to ~1 request per second.
- If the API returns an error, the sync cycle is skipped until the next tick.

### GitHub API

- The GitHub module implements **rate-limit awareness** via timeouts and retry.
- GET requests (file existence checks) time out after **10 seconds**.
- PUT requests (file uploads) time out after **30 seconds**.
- If the API returns `403` (rate limit exceeded), the operation is retried up to 3 times with exponential backoff.
- If the token is expired or revoked, a `TOKEN_EXPIRED` message is sent to the popup.

## No Server-Side Caching

The extension does not use any server-side caching:

- The Vercel OAuth broker is stateless — it does not cache tokens or user data.
- Codeforces API responses are cached only on the client side.
- No CDN, Redis, or database is used.

## Browser Cache

The extension relies on the browser's standard HTTP cache for:

- Static assets (icons, manifest).
- Built JavaScript/CSS bundles (via Vite's content hashing).

The extension does not implement any custom HTTP caching for API responses.
