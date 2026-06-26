# Codeforces Integration

The `src/codeforces/` module handles all interactions with the Codeforces API, including fetching submissions, parsing the RSS feed, and extracting source code URLs.

## Module Structure

```
src/codeforces/
└── index.ts          # Codeforces API client
```

## API Endpoints Used

### `user.status`

Fetches recent submissions for a user:

```
GET https://codeforces.com/api/user.status?handle={handle}&count=100000
```

- Returns the last 100,000 submissions for the given handle.
- Includes verdict, problem metadata, programming language, and submission time.
- Used by the sync engine to detect new accepted submissions.

### `user.rating`

Fetches rating history for a user:

```
GET https://codeforces.com/api/user.rating?handle={handle}
```

- Returns the user's rating changes over time.
- Used by the statistics module to compute current rating and rank.

### RSS Feed

Fallback feed for submission metadata:

```
GET https://codeforces.com/blog/entry/feed
```

- Provides recent blog entries (includes submission metadata).
- Used as a fallback when no active Codeforces tab is available.
- Does NOT include source code — only submission metadata (problem name, language, timestamp).
- Fetched with a 15-second timeout to prevent hanging requests.

## Dual-Tier Source Fetching

CodeforcesSync uses a dual-tier strategy to fetch submission source code:

### Tier 1: Active Tab (Content Script)

When the user has a Codeforces tab open, the extension sends a message to the content script (`src/content/tier1Fetcher.ts`) to extract the source code from the submission page DOM.

**Flow:**
1. Content script navigates or injects into the submission page.
2. Extracts the source code from the `<pre id="program-source-text">` element.
3. Returns the source code as a string.
4. The extension encodes it as Base64 and uploads to GitHub.

**Why this works:** The content script runs in the context of the authenticated Codeforces session, which bypasses Cloudflare's bot protection.

### Tier 2: RSS Feed (Fallback)

When no active Codeforces tab is available, the extension falls back to the RSS feed. This provides:

- Submission metadata (problem name, language, contest ID, submission ID).
- **No source code** — if Tier 2 is used, the submission cannot be synced until a CF tab is available.

The RSS feed fetch has a 15-second timeout. If the fetch times out or fails, the submission is skipped and logged as a warning (non-fatal).

## Statistics Module

The `src/cfstats/` module fetches Codeforces user statistics:

```ts
interface CfStats {
  rating: number;
  rank: string;
  totalProblems: number;
  contributions: number;
  friendOfCount: number;
}
```

### How It Works

1. Fetches `user.status` to count unique solved problems.
2. Fetches `user.rating` to get current rating and rank.
3. Fetches user info from the user profile page.
4. Both API fetches share an `AbortController` — if one fails, the other is aborted.
5. Results are cached in `chrome.storage.local` for **10 minutes**.

### Caching

- **TTL:** 10 minutes.
- **Storage:** Cached data is stored in `chrome.storage.local`.
- **Invalidation:** Cache is cleared when the extension is restarted or when the user explicitly refreshes.

## Polling

The sync engine polls the Codeforces API every **60 seconds** via Chrome Alarms.

- The alarm is created with `periodInMinutes: 1`.
- On each tick, the sync worker loads settings and fetches `user.status`.
- Only submissions since the last poll are processed (deduplication via synced submission IDs).

## Language Detection

Codeforces uses language tags (e.g., "GNU C++20 (64-bit, msys 2)") that are mapped to file extensions via the language map in `src/shared/utils/languageMap.ts`.

| Codeforces Language | File Extension |
|-------------------|----------------|
| C++ (GNU, MSVC) | `.cpp` |
| Python (PyPy, Python) | `.py` |
| Java | `.java` |
| JavaScript (Node, V8) | `.js` |
| Kotlin | `.kt` |
| Rust | `.rs` |
| Go | `.go` |
| C (GNU, MSVC) | `.c` |
| Delphi | `.dpr` |
| C# (Mono, .NET) | `.cs` |
| Ruby | `.rb` |
| PHP | `.php` |
| Haskell | `.hs` |
| Scala | `.scala` |
| Perl | `.pl` |
| Pascal | `.pas` |
| Lua | `.lua` |
| ... | ... |

Unknown languages fall back to `.txt`.
