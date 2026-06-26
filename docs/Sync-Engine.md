# Sync Engine

The `src/sync/` module orchestrates the end-to-end sync cycle that polls Codeforces submissions, fetches source code, and uploads to GitHub.

## Module Structure

```
src/sync/
└── index.ts          # Sync engine, retry, submission queue, history
```

## Sync Cycle

The sync cycle is triggered every **60 seconds** by Chrome Alarms:

```
1. Alarm fires
       │
       ▼
2. Load settings from storage
       │
       ▼
3. Check isSyncing flag (prevent concurrent runs)
       │
       ▼
4. Fetch recent submissions from Codeforces (user.status)
       │
       ▼
5. Filter out non-accepted and already-synced submissions
       │
       ▼
6. For each new accepted submission:
   │
   ├─ Determine file path
   ├─ Try Tier 1: Active CF tab → source code
   ├─ Fallback Tier 2: RSS feed → metadata only
   ├─ Base64-encode source code
   ├─ Check if file exists on GitHub (GET)
   ├─ Upload file to GitHub (PUT)
   └─ On success → mark as synced
   │
   ▼
7. Update streak (statistics module)
       │
       ▼
8. Save sync state to storage
       │
       ▼
9. Broadcast SYNC_SUCCESS to popup
```

## Key Components

### Submission Filtering

```ts
const isAccepted = submission.verdict === "OK";
const isAlreadySynced = syncedSubmissions.has(submission.id);
const shouldSync = isAccepted && !isAlreadySynced;
```

Only submissions with verdict `"OK"` (Accepted) are synced. Submissions with other verdicts (WA, TLE, RTE, etc.) are ignored.

### Deduplication

Synced submission IDs are stored in the `syncedSubmissions` set in settings:

```ts
interface AppSettings {
  syncedSubmissions: number[];  // submission IDs
}
```

After each sync cycle, the set is updated and saved to `chrome.storage.local`.

### File Path Generation

Files are uploaded to GitHub with paths in the format:

```
[subdirectory/]{contestId}/{submissionId}.{ext}
```

The path is constructed in `processSubmissions()` by combining:
- `settings.subdirectoryName` (optional, user-configured).
- `contestId` from the submission data.
- `submissionId` from the submission data.
- File extension from the language map.

### Upload Flow

For each submission to sync:

1. **Fetch source code** — via content script (Tier 1) or RSS feed (Tier 2).
2. **Check file existence** — `GET /repos/{owner}/{repo}/contents/{path}` (10s timeout).
3. **Upload file** — `PUT /repos/{owner}/{repo}/contents/{path}` (30s timeout).
4. **Update sync state** — Add submission ID to `syncedSubmissions`.

## Retry Engine

The sync engine wraps upload operations with a retry mechanism:

```ts
const retry = createRetryEngine();
```

### Retry Configuration

| Parameter | Value |
|-----------|-------|
| Max attempts | 3 |
| Initial delay | 1 second |
| Backoff factor | 2x (1s, 2s, 4s) |
| What triggers retry | Network errors, HTTP 409 (conflict), HTTP 403 (rate limit) |

### What Does NOT Retry

- **HTTP 403** with "token expired" — invokes the `TOKEN_EXPIRED` callback instead.
- **Graceful failures** — if the source code cannot be fetched (no CF tab, RSS failed), the submission is skipped with a warning and NOT retried.
- **Empty submission lists** — if there are no new accepted submissions, the cycle completes immediately.

## Concurrency

The sync engine uses a module-level `isSyncing` boolean flag to prevent concurrent sync cycles:

```ts
let isSyncing = false;

// In the sync worker:
if (isSyncing) return;
isSyncing = true;
try {
  // ... sync logic ...
} finally {
  isSyncing = false;
}
```

If a sync cycle is already running when the next alarm fires, the second cycle is skipped. The next alarm tick will attempt again.

**Note:** This flag is not persisted. If the service worker is terminated (MV3 idle timeout) during a sync cycle, the flag resets to `false` when the worker restarts.

## Sync State

The following state is persisted in `chrome.storage.local`:

| Field | Type | Description |
|-------|------|-------------|
| `syncedSubmissions` | `number[]` | IDs of successfully synced submissions |
| `currentStreak` | `number` | Current consecutive days with accepted submissions |
| `bestStreak` | `number` | Longest streak ever |
| `solvedDays` | `string[]` | Dates with accepted submissions (ISO date strings) |
| `lastSyncTimestamp` | `number` | Timestamp of the last sync cycle |
| `syncErrorMessage` | `string` | Last sync error message (if any) |

## Error Handling

| Scenario | Behavior |
|----------|----------|
| Codeforces API down | Sync cycle completes without processing new submissions. Existing state is preserved. |
| No active CF tab + RSS fails | Submission is skipped with a warning log. It will be retried on the next poll cycle. |
| GitHub API returns 403 | Token expired/revoked — `TOKEN_EXPIRED` message sent to popup. |
| GitHub API returns 409 (conflict) | File was modified between GET and PUT — operation retried. |
| Network timeout | Operation retried up to 3 times with backoff. |
| Storage write failure | Sync state update is skipped. Error is logged. |
