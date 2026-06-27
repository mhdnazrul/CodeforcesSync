# Troubleshooting

## Common Issues

### Code Not Syncing

**Symptoms:** You solved a problem on Codeforces, but the solution does not appear in your GitHub repository.

**Causes and Solutions:**

| Cause | Solution |
|-------|----------|
| No Codeforces tab open | Keep a `codeforces.com` tab open in your browser. The extension needs your active session to bypass Cloudflare. |
| Codeforces API is down | The extension polls `user.status` every 60 seconds. If the API returns an error, the sync cycle is skipped. Check `https://codeforces.com/api/user.status?handle=your_handle` in your browser. |
| Token expired | Your GitHub OAuth token may have expired. Go to Settings → Re-authenticate with GitHub. |
| Repository not accessible | Verify that your GitHub token has `repo` scope and that the repository exists. |
| Submission not "Accepted" | Only submissions with verdict "Accepted" (OK) are synced. Wrong answer, time limit exceeded, compilation error, etc. are ignored. |
| Submission was made before installation | Only submissions made after installing and configuring the extension are synced. |
| Browser/extension recently reinstalled | If the extension's storage was cleared, it may have lost the list of synced submissions. Submit a new problem to verify. |

### Cloudflare Blocking

**Symptoms:** The console shows "Blocked by Cloudflare" or fetch errors.

**Solution:** Keep a Codeforces tab actively open. The extension injects a content script that uses your authenticated CF session to fetch source code. If no tab is open, the extension falls back to the RSS feed (metadata only — source code cannot be fetched this way).

**Debugging:**

1. Open a Codeforces tab and log in.
2. Open the extension popup → the dashboard should show your CF handle.
3. Submit a solution on Codeforces.
4. Check the service worker logs — you should see `CodeforcesSync: ✅ Synced submission to GitHub`.

### OAuth Fails

**Symptoms:** Clicking "Login with GitHub" opens a blank page or shows an error.

**Causes and Solutions:**

| Cause | Solution |
|-------|----------|
| Broker not deployed | Deploy the Vercel broker with `vercel --prod`. |
| Wrong broker URL | Check `.env` contains `VITE_OAUTH_BROKER_URL` pointing to your Vercel deployment. |
| Missing environment variables | Ensure `GITHUB_CLIENT_ID` and `GITHUB_CLIENT_SECRET` are set in Vercel. |
| Wrong callback URL | Verify the GitHub OAuth App's callback URL matches `https://<vercel-deployment>.vercel.app/api/oauth/callback`. |
| Browser version too old | `chrome.storage.session` / `storage.session` requires Chrome/Edge 102+ or Firefox 128+. |

### Statistics Not Loading

**Symptoms:** The dashboard shows a loading spinner that never resolves.

**Causes and Solutions:**

| Cause | Solution |
|-------|----------|
| Codeforces API down | CF statistics are fetched from `user.status` and `user.rating`. If these endpoints are down, stats cannot load. |
| Invalid CF handle | Verify your Codeforces handle in Settings. The handle must match your CF account exactly (case-sensitive). |
| Network issue | Check your internet connection. The extension requires internet access to reach `codeforces.com`. |

### Settings Not Saving

**Symptoms:** Changes in Settings are not persisted after closing the popup.

**Causes and Solutions:**

| Cause | Solution |
|-------|----------|
| Storage quota exceeded | `chrome.storage.local` has a 10MB quota. If you have an unusually large number of synced submissions, the storage may be full. Reset the extension and start fresh. |
| Corrupted data | Try "Reset All" in Settings. This clears all stored data. |
| Extension not loaded | Ensure the extension is loaded and enabled in `chrome://extensions`. |

## Debugging Guides

### Accessing Service Worker Logs

1. Open `chrome://extensions`.
2. Find CodeforcesSync.
3. Click the **Service Worker** link under "Inspect views".
4. The DevTools console opens with all service worker logs.
5. Look for messages prefixed with `CodeforcesSync:`.

### Accessing Popup Logs

Right-click the extension icon in the toolbar and select **Inspect popup**. The DevTools console shows popup logs.

### Checking OAuth State

Open `chrome://identity-internals` to see cached OAuth tokens. This is useful for debugging OAuth flow issues.

### Manual API Testing

Test the Codeforces API directly:

```bash
curl https://codeforces.com/api/user.status?handle=tourist&count=5
```

Test the GitHub API:

```bash
curl -H "Authorization: Bearer <token>" https://api.github.com/user
```

## Getting Help

If you cannot resolve the issue:

1. Search [existing issues](https://github.com/mhdnazrul/CodeforcesSync/issues).
2. Open a [new issue](https://github.com/mhdnazrul/CodeforcesSync/issues/new) with:
   - Chrome version.
   - Extension version.
   - Steps to reproduce.
   - Console logs from the service worker and popup.
3. Include what you have already tried.
