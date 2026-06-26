# GitHub Integration

The `src/github/` module handles all interactions with the GitHub REST API, including authentication, file upload, and repository management.

## Module Structure

```
src/github/
└── index.ts          # GithubHandler class
```

## Dependencies

The `GitHub` module depends on:

- **GithubCredentialStore** (interface) — For reading and writing the GitHub Personal Access Token.
- **Rate-limit awareness** — Built-in timeout handling for API calls.

It does NOT depend on any browser API, making it testable in Node.js.

## API Coverage

### File Upload

The primary operation is uploading a file to a GitHub repository via the Contents API:

```
PUT /repos/{owner}/{repo}/contents/{path}
```

Request body:

```json
{
  "message": "Add solution to 1234A - Problem Name",
  "content": "base64-encoded-source-code",
  "sha": null
}
```

- `sha` is omitted for new files; for existing files the SHA is fetched first via `GET /repos/{owner}/{repo}/contents/{path}`.
- If the file already exists and the SHA is provided, GitHub replaces the existing file.

### File Existence Check

Before uploading, the module checks if a file already exists:

```
GET /repos/{owner}/{repo}/contents/{path}
```

- Returns the file metadata (including SHA) if it exists.
- Returns `404` if the file does not exist.
- Returns `403` if the token lacks access to the repository.

## Authentication

The module requires a GitHub Personal Access Token with the `repo` scope. The token is:

1. Obtained via OAuth (see [OAuth.md](OAuth.md)).
2. Stored in `chrome.storage.local` via the `GithubCredentialStore` interface.
3. Passed as an HTTP Bearer token in the `Authorization` header.

### Credential Store Interface

```ts
interface GithubCredentialStore {
  getToken(): Promise<string | null>;
  saveToken(token: string, username: string): Promise<void>;
  clear(): Promise<void>;
}
```

## Rate Limiting and Timeouts

### Timeouts

| Operation | Timeout | Location |
|-----------|---------|----------|
| `checkFileExists` (GET) | 10 seconds | `github/index.ts` — passed as `timeoutMs` to `fetchWithRateLimit` |
| `uploadFile` (PUT) | 30 seconds | `github/index.ts` — passed as `timeoutMs` to `fetchWithRateLimit` |

### Retry Mechanism

The module does NOT implement its own retry. Instead, the sync engine wraps upload calls with a retry engine that handles failures (see [Sync-Engine.md](Sync-Engine.md)).

The sync engine retries failed operations up to 3 times with exponential backoff (1s, 2s, 4s).

### Error Handling

Errors are returned as structured objects:

| Condition | Response |
|-----------|----------|
| HTTP 403 (token invalid/expired) | `TOKEN_EXPIRED` message sent to popup |
| HTTP 404 (repo/file not found) | Returns `false` — caller handles |
| HTTP 409 (conflict) | Returns `false` — caller may retry |
| Network error | Returns `false` — caller retries |
| Rate limit exceeded | Returns `false` — caller backs off |
| Timeout | Returns `false` — caller retries |

When the token is expired, a `TOKEN_EXPIRED` message is broadcast to the popup, which can prompt the user to re-authenticate.

## File Path Construction

Files are uploaded to GitHub with paths in the format:

```
[subdirectory/]{contestId}/{submissionId}.{ext}
```

Where:
- `subdirectory` — Optional user-configured folder (e.g., `solutions/`).
- `contestId` — The Codeforces contest ID.
- `submissionId` — The Codeforces submission ID (ensures uniqueness).
- `ext` — File extension mapped from the Codeforces language tag (e.g., `.cpp`, `.py`, `.java`).

Example: `solutions/1234/98765432.cpp`

## Token Expiry

The `GithubHandler` constructor accepts a callback that is invoked when the API responds with `403` (token expired or invalid):

```ts
const github = new GithubHandler(credentialStore, () => {
  runtime.sendMessage({ type: "TOKEN_EXPIRED" });
});
```

The popup listens for `TOKEN_EXPIRED` messages and can display a re-authentication prompt.
