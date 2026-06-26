# OAuth Flow

CodeforcesSync uses **GitHub OAuth** to authenticate users and obtain an access token for the GitHub REST API. The flow is implemented via a **stateless Vercel broker** that handles the OAuth handshake without storing tokens.

## Architecture

```
┌──────────────┐     ┌─────────────────┐     ┌──────────────┐
│  Extension   │     │  Vercel Broker  │     │   GitHub     │
│  (Service    │     │  (stateless)    │     │   OAuth      │
│   Worker)    │     │                 │     │              │
└──────┬───────┘     └────────┬────────┘     └──────┬───────┘
       │                      │                      │
       │  1. OAUTH_START      │                      │
       │─────────────────────►│                      │
       │                      │  2. Authorize URL    │
       │                      │─────────────────────►│
       │                      │                      │
       │                      │  3. User approves    │
       │                      │  (browser redirect)  │
       │                      │◄─────────────────────│
       │                      │                      │
       │  4. Callback with    │                      │
       │     auth code        │                      │
       │◄─────────────────────│                      │
       │                      │                      │
       │  5. Exchange code    │                      │
       │     for token        │                      │
       │─────────────────────►│─────────────────────►│
       │                      │                      │
       │  6. Token delivered  │                      │
       │     via redirect     │                      │
       │◄─────────────────────│◄─────────────────────│
       │                      │                      │
       │  7. Store token      │                      │
       │     in chrome.       │                      │
       │     storage.local    │                      │
       ▼                      ▼                      ▼
```

## Flow Details

### 1. Initiation (Extension)

The user clicks "Login with GitHub" in the popup. The popup sends an `OAUTH_START` message to the service worker:

```ts
const response = await chrome.runtime.sendMessage({ type: "OAUTH_START" });
```

The service worker calls `chrome.identity.launchWebAuthFlow()` with a URL pointing to the Vercel broker's `/api/oauth/authorize` endpoint.

### 2. Authorization (Vercel Broker → GitHub)

The broker's `authorize.ts` generates:

- A random **state** parameter (16-byte hex) for CSRF protection.
- A **code verifier** (cryptographically random) and its **S256 challenge** for PKCE.
- The `state` and `verifier` are stored in `chrome.storage.session` (ephemeral, cleared on browser restart).

The broker redirects the user to GitHub's OAuth authorization URL with:

- `client_id` — The GitHub OAuth App's client ID.
- `redirect_uri` — The broker's callback URL.
- `state` — The CSRF token.
- `code_challenge` — The PKCE S256 challenge.
- `code_challenge_method` = `S256`.
- `scope` = `repo`.

### 3. User Approval (GitHub)

GitHub displays the authorization screen with the requested `repo` scope. The user approves, and GitHub redirects to the broker's callback URL with the `code` and `state` parameters.

### 4. Callback Processing (Vercel Broker)

The broker's `callback.ts`:

1. Validates the `state` parameter against the stored state (verifies via the extension's state comparison — the broker includes the state in the redirect so the extension can verify it).
2. Exchanges the `code` for an access token by calling GitHub's `/login/oauth/access_token`.
3. Redirects to `chrome-extension://<extension-id>/oauth-callback#token=<token>&username=<username>&state=<state>`.

The `307` redirect ensures the HTTP method (GET) is preserved. Chrome's `launchWebAuthFlow` intercepts this redirect and returns the URL to the extension.

### 5. Token Storage (Extension)

The service worker parses the token and username from the redirect URL, then calls:

```ts
await store.saveSettings({ githubToken: token, githubUsername: username });
```

The token is now stored in `chrome.storage.local` — accessible only to the extension's own origin.

## Security Measures

| Measure | Implementation |
|---------|---------------|
| **PKCE (S256)** | Code verifier/challenge generated in the service worker. The broker never sees the verifier. |
| **CSRF protection** | Random 16-byte hex state token verified on callback. Mismatch rejects the flow. |
| **Stateless broker** | All flow state encoded into the OAuth `state` parameter. No KV store, no database. |
| **Token delivery** | Token embedded in URL fragment of `chrome-extension://` redirect — never hits the network. |
| **Redirect URI validation** | Broker validates redirect URIs against a strict regex — rejects malicious URIs. |
| **Session storage** | Verifier and state live in `chrome.storage.session` — cleared immediately after flow completes. |
| **No secret leakage** | Client secret only referenced server-side on Vercel — never embedded in extension source. |

## Broker Endpoints

### `GET /api/oauth/authorize`

Initiates the OAuth flow. Redirects to GitHub's authorization URL.

**Query parameters:**

| Param | Required | Description |
|-------|----------|-------------|
| `redirect_uri` | Yes | The extension's redirect URI (`chrome-extension://<id>/oauth-callback`) |

**Response:** 302 redirect to GitHub OAuth authorize URL.

### `GET /api/oauth/callback`

Handles the OAuth callback from GitHub. Exchanges the code for a token.

**Query parameters:**

| Param | Required | Description |
|-------|----------|-------------|
| `code` | Yes | Authorization code from GitHub |
| `state` | Yes | State parameter for validation |

**Response:** 307 redirect to `chrome-extension://<id>/oauth-callback#token=...&username=...&state=...`

## Environment Variables

### Vercel (Server-Side)

| Variable | Description |
|----------|-------------|
| `GITHUB_CLIENT_ID` | GitHub OAuth App client ID |
| `GITHUB_CLIENT_SECRET` | GitHub OAuth App client secret |

### Extension (Build-Time)

| Variable | Description |
|----------|-------------|
| `VITE_OAUTH_BROKER_URL` | URL of the Vercel broker deployment |

## Threat Model

- **Compromised broker** — An attacker who controls the Vercel deployment could swap the token during the callback. Mitigation: the final redirect goes to `chrome-extension://` which Chrome intercepts locally; the attacker never sees the delivered token. However, a malicious broker could return a different token or deny the flow. This risk is accepted because the broker is stateless and the Vercel deployment is controlled by the project maintainer.

- **Compromised extension** — The token is stored in `chrome.storage.local`, accessible only to the extension's own origin. Other extensions cannot read it.

- **Network eavesdropping** — All broker communications are HTTPS. The token is never transmitted in URLs to external servers — only to the local `chrome-extension://` redirect.
