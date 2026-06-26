# Security

## Overview

CodeforcesSync is designed with security as a primary concern. The extension handles GitHub authentication tokens and communicates with external APIs, making token safety and data privacy critical.

## Token Storage

### GitHub Access Token

- **Storage:** `chrome.storage.local` — this storage is scoped to the extension's origin and is not accessible to other extensions or websites.
- **Display:** The token is never displayed in plaintext in the UI.
- **Logging:** The token is never logged to console or sent to any third party.
- **Transmission:** The token is sent only to `api.github.com` in the `Authorization: Bearer <token>` header.

### OAuth Ephemeral State

- **Storage:** `chrome.storage.session` — cleared when the browser restarts.
- **Lifetime:** The verifier and state are stored only during the OAuth flow (typically < 60 seconds) and are deleted immediately after the flow completes.
- **Content:** Contains the PKCE code verifier and CSRF state token — never the access token.

## OAuth Flow Security

See [OAuth.md](OAuth.md) for full details. Key security measures:

| Measure | Description |
|---------|-------------|
| PKCE (S256) | Prevents authorization code interception |
| CSRF state token | Random 16-byte hex, validated on callback |
| Stateless broker | No token storage on the Vercel server |
| Token delivery | Via `chrome-extension://` redirect URL, intercepted by Chrome before any network request |
| Redirect URI validation | Strict regex pattern validation |

## Network Security

- **HTTPS only** — All communications with GitHub API, Codeforces API, and the Vercel broker use HTTPS.
- **No telemetry** — The extension does not include any analytics, tracking, or telemetry.
- **No third-party CDNs** — All dependencies are bundled at build time. No runtime loading of external scripts.

## Manifest Permissions

The extension requests only the minimum required permissions:

| Permission | Purpose |
|------------|---------|
| `storage` | Persisting settings, sync state, and cached statistics |
| `alarms` | Scheduling periodic sync polls |
| `identity` | OAuth flow via `chrome.identity.launchWebAuthFlow` |
| `scripting` | Injecting content scripts into Codeforces pages |
| Host: `*.codeforces.com` | Fetching submissions and injecting content scripts |
| Host: `*.github.com` | Accessing the GitHub REST API |

Each permission is reviewed during development. No permission is included "just in case."

## Content Script Security

- Content scripts are injected only into `codeforces.com` pages.
- They extract source code from the DOM (`<pre id="program-source-text">`) — they do not read passwords, tokens, or other sensitive data.
- They do not modify the Codeforces page or inject any UI.
- They do not communicate with any server other than the extension's service worker.

## Input Validation

- GitHub repository URLs are validated and normalized before saving.
- Codeforces handles are validated against a strict pattern (alphanumeric, hyphens, underscores; 3-24 characters).
- All user inputs are validated client-side before being persisted.

## Dependency Security

- All dependencies are installed via npm and included in `package-lock.json`.
- Regular `npm audit` is run to identify vulnerable dependencies.
- Dependencies are updated when security advisories are published.
- The extension bundles all dependencies at build time — no runtime dependency loading.

## Known Limitations

### chrome.storage.session Availability

The OAuth flow requires `chrome.storage.session`, which is available in Chrome 102+. Users on older Chrome versions will see an error when starting OAuth.

### No Token Encryption

The GitHub access token is stored in `chrome.storage.local` without additional encryption. Chrome's storage is encrypted at rest on supported platforms (macOS Keychain, Windows DPAPI), but the extension does not add a second layer of encryption.

### Active Tab Requirement

The extension requires an active Codeforces tab to fetch source code. This is a functional requirement, not a security vulnerability. Users who are concerned about the content script's capabilities can review the source in `src/content/`.

## Reporting Vulnerabilities

If you discover a security vulnerability, please report it privately following the guidelines in [SECURITY.md](../SECURITY.md). Do not disclose it publicly until it has been addressed.
