# Frequently Asked Questions

## General

### What is CodeforcesSync?

CodeforcesSync is a Chrome extension that automatically detects when you get an "Accepted" verdict on Codeforces and pushes the solution to a GitHub repository of your choice. It runs in the background — no manual copying or committing required.

### Does this work on Firefox?

Yes. Firefox is fully supported (version 128+). See the [Release Guide](Release-Guide.md) for Firefox installation instructions.

### Is this free?

Yes. CodeforcesSync is open source under the MIT License.

### Do I need a GitHub account?

Yes. You need a GitHub account with a repository to store your solutions. You also need a GitHub Personal Access Token with `repo` scope (obtained via OAuth during setup).

## Installation

### What browser version do I need?

- **Chrome / Edge:** version 102 or later. The extension uses `chrome.storage.session`, introduced in Chrome 102 (May 2022).
- **Firefox:** version 128 or later. `storage.session` is available since Firefox 128.

### How do I install the extension?

Download the latest release ZIP from the [Releases page](https://github.com/mhdnazrul/CodeforcesSync/releases), extract it, and load it as an unpacked extension in Chrome (`chrome://extensions` → Developer mode → Load unpacked).

### Is it available on the Chrome Web Store or Firefox Add-ons (AMO)?

Not yet. The extension is distributed via GitHub Releases. See the [Roadmap](Roadmap.md) for store submission plans.

## Security

### Is my GitHub token safe?

Yes. The token is stored in `chrome.storage.local`, which is only accessible to the extension's own origin. The token is never logged, displayed, or sent to third parties. The OAuth flow uses PKCE and passes through a stateless Vercel broker that never stores the token.

### Can the extension access my private repositories?

Only if you grant it access during OAuth. The extension requests the `repo` scope, which allows it to read and write to repositories you choose. You can revoke this access at any time from your GitHub settings.

### Does the extension collect analytics?

No. The extension does not include any analytics, tracking, or telemetry.

### Why does the extension need the `scripting` permission?

The extension injects a content script into Codeforces pages to extract source code from the DOM. This is required to bypass Cloudflare's bot protection.

## Features

### Which submissions are synced?

Only submissions with the "Accepted" (OK) verdict are synced. Submissions with other verdicts (wrong answer, time limit exceeded, compilation error, etc.) are ignored.

### Can I choose which submissions to sync?

Currently, all accepted submissions are synced automatically. Selective syncing is on the [Roadmap](Roadmap.md).

### Can I organize solutions into folders?

Yes. You can configure a subdirectory in Settings (e.g., `solutions/`). All synced files will be placed under that directory.

### Does it sync past submissions?

No. Only submissions made after installing and configuring the extension are synced. There is no backfill feature.

### How often does the extension check for new submissions?

Every 60 seconds, via Chrome Alarms.

### What if I solve a problem without a Codeforces tab open?

The submission will not be synced until a Codeforces tab is available. The extension polls the Codeforces API every 60 seconds and will detect the new submission, but it needs an active tab to fetch the source code. If no tab is available, the extension falls back to the RSS feed (metadata only — source code cannot be synced).

## Troubleshooting

### My code isn't syncing. What should I check?

1. Is a Codeforces tab open in your browser?
2. Is your submission "Accepted" (not WA, TLE, etc.)?
3. Is your GitHub token still valid?
4. Check the service worker logs for errors.
5. See [Troubleshooting](Troubleshooting.md) for detailed steps.

### The OAuth window is blank. What's wrong?

- Verify your Vercel broker is deployed.
- Check that `GITHUB_CLIENT_ID` and `GITHUB_CLIENT_SECRET` are set.
- Verify the OAuth callback URL matches your Vercel deployment.
- Make sure you're on Chrome 102+, Edge 102+, or Firefox 128+.

### The dashboard shows "Failed to fetch statistics."

The Codeforces API may be down, or your handle may be incorrect. Check your handle in Settings and verify it at `https://codeforces.com/profile/your_handle`.

## Technical

### How does the extension bypass Cloudflare?

The extension injects a content script into your active Codeforces tab. The script runs in your authenticated browser session, which Cloudflare trusts. The script extracts the source code from the submission page DOM and sends it back to the service worker.

### What happens if there's no Codeforces tab open?

The extension falls back to parsing the Codeforces RSS feed. The RSS feed contains submission metadata (problem name, language, contest ID) but **not** the source code. Without an active tab, the source code cannot be fetched.

### How does the sync engine handle rate limits?

- GitHub API: The extension retries failed requests up to 3 times with exponential backoff (1s, 2s, 4s). GET requests time out at 10 seconds, PUT requests at 30 seconds.
- Codeforces API: The extension polls every 60 seconds, well below the rate limit threshold.

### Can I run the extension on multiple machines?

Yes. You need to go through the OAuth and setup process on each machine. Your GitHub token can have multiple active tokens (from OAuth or PATs).

### How do I uninstall the extension?

Go to `chrome://extensions`, find CodeforcesSync, and click **Remove**. This deletes all extension data, including your GitHub token and settings.

## Contributing

### How can I contribute?

See [CONTRIBUTING.md](../CONTRIBUTING.md) for guidelines. Contributions are welcome.

### How do I report a bug?

Open a [bug report](https://github.com/mhdnazrul/CodeforcesSync/issues/new?template=bug_report.md) with steps to reproduce, Chrome version, and console logs from the service worker and popup.

### How do I request a feature?

Open a [feature request](https://github.com/mhdnazrul/CodeforcesSync/issues/new?template=feature_request.md).
