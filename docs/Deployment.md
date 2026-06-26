# Deployment Guide

## Platform Requirements

- **Browser:** Google Chrome (Manifest V3 only)
- **Minimum Chrome version:** 102 (required for `chrome.storage.session` API support, May 2022)
- **GitHub OAuth App:** Required for user authentication (see Section 1)
- **Distribution:** Pre-built ZIP files via GitHub Releases (recommended for end users)

### Notes

- **Codeforces statistics** are fetched exclusively from the official Codeforces API (`user.status`, `user.rating`). No unofficial endpoints are used.
- **Statistics cache:** CF stats are cached for 10 minutes to reduce API load. Cache is stored in `chrome.storage.local` and cleared on extension restart.

---

## 1. Register GitHub OAuth App

Navigate to **Settings → Developer settings → OAuth Apps → New OAuth App** (`https://github.com/settings/developers`).

### App Settings

| Field | Value |
|-------|-------|
| **Application name** | `Codeforces Sync` |
| **Homepage URL** | `https://github.com/<your-username>/CodeforcesSync` |
| **Application description** | *(optional)* Syncs Codeforces submissions to a GitHub repository |
| **Authorization callback URL** | `https://<vercel-deployment>.vercel.app/api/oauth/callback` |

**Important:** The callback URL must match your Vercel project's domain exactly. Replace `<vercel-deployment>` with your actual deployment URL (e.g., `codeforces-sync.vercel.app`).

### Scopes Requested

The extension requests the **`repo`** scope only:

- **`repo`** — Full control of public and private repositories (required to push code to the selected repo).

No other scopes are requested.

### Security Checklist

After creating the app, note the **Client ID** and generate a **Client Secret**. These are set as Vercel environment variables (never committed).

---

## 2. Environment Variables

### Vercel (Server-Side)

Set these in your Vercel project dashboard (**Settings → Environment Variables**):

| Variable | Value | Notes |
|----------|-------|-------|
| `GITHUB_CLIENT_ID` | `Iv23...` | From GitHub OAuth App page |
| `GITHUB_CLIENT_SECRET` | `****************` | From GitHub OAuth App page (generate one) |

Both are required — the broker will return HTTP 500 if either is missing.

### Extension (Build-Time)

Create a `.env` file in the project root (never commit it):

```
VITE_OAUTH_BROKER_URL=https://<vercel-deployment>.vercel.app
```

This tells the extension's background service worker where to find the OAuth broker.

---

## 3. Deploy Broker to Vercel

### Prerequisites

```bash
npm i -g vercel
vercel login
```

### Deploy

```bash
vercel --prod
```

The `vercel.json` at project root configures function timeouts (10s for authorize, 15s for callback). Ensure the `api/oauth/` directory is detected as serverless functions.

### Verify Endpoints

After deployment, verify the broker is reachable:

```bash
# Authorize endpoint (should return 400 — missing params)
curl -I https://<vercel-deployment>.vercel.app/api/oauth/authorize

# Callback endpoint (should return 302 — missing state)
curl -I https://<vercel-deployment>.vercel.app/api/oauth/callback
```

---

## 4. Build & Distribute

```bash
# Install dependencies
npm install

# Build the extension
npm run build

# The output is in dist/
```

The built extension in `dist/` can be:
- Loaded as an unpacked extension in Chrome (`chrome://extensions` → Load unpacked).
- Packaged into a ZIP for distribution via GitHub Releases (see [Release-Guide.md](Release-Guide.md)).

---

## 5. Security Best Practices

| Practice | Implementation |
|----------|---------------|
| **PKCE (S256)** | Code verifier/challenge generated in background service worker — broker never sees the verifier |
| **Stateless broker** | All flow state encoded into the OAuth `state` parameter — no KV store, no Redis, no database |
| **CSRF protection** | Random 16-byte hex state token verified on callback — mismatch rejects the flow |
| **Token delivery** | Token embedded in URL fragment of `*.chromiumapp.org` redirect — never hits the network |
| **Redirect URI validation** | Broker validates redirect URIs against a strict regex (`[a-p]{32}`) — rejects malicious URIs |
| **Session storage** | Verifier and state live in `chrome.storage.session` — cleared immediately after flow completes |
| **No secret leakage** | Client secret only referenced server-side on Vercel — never embedded in extension source |

### Threat Model

- **Compromised broker** — Attacker controls the Vercel deployment. Since the broker is stateless and only relays the token, the attacker could swap the token. Mitigation: the final redirect goes to `*.chromiumapp.org` which Chrome intercepts locally; the attacker never sees the token.
- **Compromised extension** — Token stored in `chrome.storage.local` (via `AppSettings`) — accessible only to the extension's own origin.
- **Network eavesdropping** — All broker communications are HTTPS. Token is never transmitted in URLs to external servers — only to the local `*.chromiumapp.org` redirect.

---

## 6. Screenshots Checklist

Capture the following for release notes or documentation:

- [ ] GitHub OAuth App settings page (showing App Name, Homepage URL, Callback URL)
- [ ] GitHub authorization consent screen (showing `repo` scope)
- [ ] Extension popup — GitHub Auth screen (`Login with GitHub` button)
- [ ] Extension popup — repository setup screen (after successful auth)
- [ ] Vercel environment variables page (showing `GITHUB_CLIENT_ID` and `GITHUB_CLIENT_SECRET` set)
- [ ] Vercel deployment log (showing successful deploy)
- [ ] Chrome extensions page (`chrome://extensions`) showing the loaded extension
- [ ] A successful sync in action (submission appearing in the GitHub repo)

---

## 7. Production Readiness Checklist

- [ ] GitHub OAuth App registered with correct callback URL
- [ ] `GITHUB_CLIENT_ID` and `GITHUB_CLIENT_SECRET` set in Vercel
- [ ] `.env` file created with `VITE_OAUTH_BROKER_URL`
- [ ] Broker deployed and endpoints verified
- [ ] Extension built with `npm run build` (no errors)
- [ ] Extension loaded in Chrome and full OAuth flow tested
- [ ] Sync runs on schedule (verified via `chrome://alarms`)
