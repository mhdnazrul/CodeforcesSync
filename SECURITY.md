# Security Policy

## Supported Versions

| Version | Supported |
|---------|-----------|
| Latest release | ✅ |
| Development builds | ❌ |

## Reporting a Vulnerability

If you discover a security vulnerability in CodeforcesSync, please report it privately. **Do not** disclose it publicly until we have had a chance to address it.

### How to Report

Send an email to **mhdnazrul511@gmail.com** with the following details:

- A description of the vulnerability.
- Steps to reproduce it.
- The version of the extension you are using.
- Any relevant screenshots or logs.

You should receive a response within **48 hours**. If you do not, please follow up.

### What to Expect

- We will acknowledge receipt within 48 hours.
- We will assess the severity and impact.
- We will work on a fix and release it as soon as possible.
- We will credit you in the release notes (unless you prefer to remain anonymous).

## Security Model

### Token Storage

- GitHub OAuth tokens are stored in `chrome.storage.local`, which is accessible only to the extension's own origin.
- No tokens are ever logged, displayed in plaintext in the UI, or sent to third parties.

### OAuth Flow

- The extension uses PKCE (S256) for the OAuth flow.
- The Vercel broker is stateless — it never stores tokens.
- The access token is delivered via a `chrome-extension://` redirect URL that Chrome intercepts before any network request.
- The broker validates redirect URIs against a strict regex pattern.

### Network Security

- All communications with GitHub API, Codeforces API, and the Vercel broker use HTTPS.
- No telemetry, analytics, or tracking is included in the extension.

### Manifest Permissions

The extension requests only the permissions it actively uses:

- `storage` — For persisting settings and sync state.
- `alarms` — For scheduling sync polls.
- `identity` — For OAuth flow via `launchWebAuthFlow`.
- `scripting` — For injecting content scripts into Codeforces pages.
- Host permissions for `codeforces.com` and `github.com`.

## Known Security Considerations

- **Active tab requirement** — The extension needs an open Codeforces tab to fetch source code. This is a functional requirement, not a security issue.
- **chrome.storage.session / storage.session** — Requires Chrome/Edge 102+ or Firefox 128+. The extension will fail to start OAuth on older versions.
- **No sandboxing** — The content script runs in the Codeforces page context and has access to the DOM.

## Third-Party Dependencies

Dependencies are managed via npm. We use `npm audit` regularly and update dependencies when security advisories are published.
