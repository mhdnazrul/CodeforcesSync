# Statistics Module

The `src/statistics/` module computes streak data and weekly progress for the dashboard.

## Module Structure

```
src/statistics/
└── index.ts          # Streak math and calendar computation
```

## Streak Calculation

### Current Streak

The current streak is the number of consecutive days (ending today) on which the user had at least one accepted submission.

**Algorithm:**

```
1. Load solvedDays array (sorted, ISO date strings)
2. Start from today and count backward
3. For each day going backward:
   - If the day has a solved submission → increment streak
   - If the day has no solved submission → break
4. Return the count
```

- Today counts if the user has at least one accepted submission today.
- If the user did not solve anything yesterday but has a submission last week, the streak is 0 (broken).
- The streak resets to 0 after any day with zero accepted submissions.

### Best Streak

The best streak is the maximum value the current streak has ever reached. It is stored in settings and updated whenever the current streak exceeds it.

```
bestStreak = max(bestStreak, currentStreak)
```

## Weekly Calendar

The weekly calendar shows a 7-day grid (Sunday through Saturday) indicating which days had solved submissions.

```ts
interface DayProgress {
  day: string;       // "S", "M", "T", "W", "T", "F", "S"
  dateStr: string;   // ISO date string
  solved: boolean;   // true if at least one AC submission
  isFuture: boolean; // true if the day is in the future
  isToday: boolean;  // true if the day is today
}
```

The calendar is computed from the `solvedDays` array and displayed in the dashboard as a row of colored cells.

## Data Flow

```
Codeforces API (user.status)
       │
       ▼
Sync Engine processes new AC submissions
       │
       ▼
statistics/index.ts:
  - Adds today's date to solvedDays
  - Recalculates currentStreak
  - Updates bestStreak if needed
       │
       ▼
Storage: saves solvedDays, currentStreak, bestStreak
       │
       ▼
Popup Dashboard:
  - ApiContext loads settings
  - buildStats() computes weekly calendar
  - Streak numbers and calendar displayed
```

## Data Storage

Streak data is stored as part of `AppSettings` in `chrome.storage.local`:

```ts
interface AppSettings {
  solvedDays: string[];     // Dates with AC submissions (ISO format)
  currentStreak: number;
  bestStreak: number;
}
```

## Codeforces Statistics (CfStats)

The `src/cfstats/` module fetches additional Codeforces profile data for the dashboard:

```ts
interface CfStats {
  rating: number;           // Current rating
  rank: string;             // e.g., "master", "expert"
  totalProblems: number;    // Total problems solved (all time)
  contributions: number;    // Contribution count
  friendOfCount: number;    // Number of users who have this user as a friend
}
```

### How It Works

1. Fetches `user.status` (last 100K submissions) to count unique solved problems.
2. Fetches `user.rating` (rating history) to get current rating and rank.
3. Fetches user info from the profile page for contributions and friend count.
4. Both API fetches share an `AbortController` — failure in one cancels the other.

### Caching

CfStats are cached for **10 minutes**:

- The popup requests fresh stats via `FETCH_CF_STATS` message.
- The background worker fetches from the API and returns the result.
- No server-side cache — each fetch hits the Codeforces API directly.
- Cache TTL is managed client-side by the popup (it only requests stats if 10 minutes have passed since the last fetch).

## Error States

| State | UI Behavior |
|-------|-------------|
| Loading | Dashboard shows loading skeleton |
| Error (API down) | Dashboard shows error message with Retry button |
| Error (invalid handle) | Dashboard shows error with Retry button |
| Success | Dashboard displays stats |
| Not yet fetched | Dashboard shows initial loading state |
