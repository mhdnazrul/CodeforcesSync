# Repository Validation

CodeforcesSync validates the GitHub repository URL before saving it. Validation ensures the repository is reachable and properly formatted.

## URL Normalization

When a user enters a GitHub repository URL (either during onboarding or in settings), the input is normalized via `extractRepoName()`:

```ts
function extractRepoName(input: string): string {
  const trimmed = input.trim();
  if (!trimmed) return trimmed;
  const match = trimmed.match(
    /^(?:https?:\/\/)?(?:www\.)?github\.com\/([^/]+)\/([^/#.?]+)/
  );
  return match ? `${match[1]}/${match[2]}` : trimmed;
}
```

### Accepted Input Formats

| Input | Normalized Output |
|-------|------------------|
| `https://github.com/owner/repo` | `owner/repo` |
| `https://github.com/owner/repo.git` | `owner/repo` |
| `https://github.com/owner/repo/` | `owner/repo` |
| `github.com/owner/repo` | `owner/repo` |
| `www.github.com/owner/repo` | `owner/repo` |
| `owner/repo` | `owner/repo` |
| `repo` | `repo` (legacy — uses githubUsername as owner) |

### Where Normalization Applies

- **Onboarding** (`RepositorySetupScreen` → `linkRepository`): Calls `extractRepoName` before saving.
- **Settings** (`SettingsScreen` → `saveSettings`): Calls `extractRepoName` before saving.
- **Sync engine** (`sync/index.ts`): Splits on `/` — first part is owner, second is repo name. If no `/`, uses `githubUsername` as owner (backward compatibility with `repo`-only values).

## Validation

### Client-Side Validation

The `validateGithubRepo()` function in `src/ui/utils/errors.ts` validates input format:

```ts
function validateGithubRepo(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return "Repository URL is required";

  const githubUrlPattern = /^(?:https?:\/\/)?(?:www\.)?github\.com\/([^/]+)\/([^/#.?]+)/;
  const repoPattern = /^[a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+$/;

  if (!githubUrlPattern.test(trimmed) && !repoPattern.test(trimmed)) {
    return "Enter a valid GitHub URL or owner/repo name";
  }
  return null;
}
```

| Input | Validation | Reason |
|-------|-----------|--------|
| `https://github.com/owner/repo` | ✅ Pass | Valid URL format |
| `owner/repo` | ✅ Pass | Valid owner/repo format |
| `repo` | ❌ Fail | No `/` separator (except legacy) |
| `https://gitlab.com/owner/repo` | ❌ Fail | Not a GitHub URL |
| `owner` | ❌ Fail | No repo name |
| `owner//repo` | ❌ Fail | Double slash |
| (empty) | ❌ Fail | Required |

### Server-Side Validation

There is no server-side validation. The extension does not verify that the repository exists or that the token has access to it. If the repository does not exist or the token lacks access, the first upload attempt will fail with a `404` or `403` response from the GitHub API.

This is by design — attempting to validate every repo change with an API call would:
1. Slow down the settings UI.
2. Consume GitHub API quota.
3. Fail on transient network errors.
