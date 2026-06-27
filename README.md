<div align="center">
  <img src="public/icons/icon128.png" alt="CodeforcesSync Logo" width="128" />
  <h1>CodeforcesSync</h1>
  <p><strong>Automatically sync your accepted Codeforces solutions to GitHub in real-time.</strong></p>

  <p>
    <a href="https://github.com/mhdnazrul/CodeforcesSync/releases"><img src="https://img.shields.io/github/v/release/mhdnazrul/CodeforcesSync?style=for-the-badge&color=blue" alt="Release Badge"/></a>
    <a href="https://github.com/mhdnazrul/CodeforcesSync/blob/main/LICENSE"><img src="https://img.shields.io/badge/License-MIT-success.svg?style=for-the-badge" alt="License Badge"/></a>
    <a href="https://www.typescriptlang.org"><img src="https://img.shields.io/badge/TypeScript-5.9-3178C6?style=for-the-badge&logo=typescript" alt="TypeScript"/></a>
    <a href="https://react.dev"><img src="https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react" alt="React"/></a>
    <a href="https://developer.chrome.com/docs/extensions/mv3/"><img src="https://img.shields.io/badge/Chrome%20Extension-MV3-4285F4?style=for-the-badge&logo=googlechrome" alt="Chrome Extension MV3"/></a>
    <a href="https://github.com/mhdnazrul/CodeforcesSync/stargazers"><img src="https://img.shields.io/github/stars/mhdnazrul/CodeforcesSync?style=for-the-badge&color=yellow" alt="Stars Badge"/></a>
    <a href="https://github.com/mhdnazrul/CodeforcesSync/network/members"><img src="https://img.shields.io/github/forks/mhdnazrul/CodeforcesSync?style=for-the-badge&color=orange" alt="Forks Badge"/></a>
  </p>
</div>

---

## Quick Start

```bash
# 1. Download the latest release
#    https://github.com/mhdnazrul/CodeforcesSync/releases

# 2. Extract the ZIP and load it in your browser
#    chrome://extensions → Developer mode → Load unpacked

# 3. Open the extension → connect GitHub → enter Codeforces handle → link repo
# 4. Solve a problem on Codeforces — it appears on GitHub within 1 minute
```

> No manual copying, no manual committing. The extension runs in the background.

---

## Overview

**CodeforcesSync** is a Chrome extension for competitive programmers. It bridges your Codeforces solving activity with your GitHub profile by automatically detecting accepted ("Accepted") verdicts and pushing the source code to a repository of your choice.

The extension runs entirely in the background — no manual copying, no manual committing. Solve a problem, and it appears on GitHub.

---

## Features

- **Automated syncing** — Accepted submissions are detected and pushed to GitHub automatically.
- **Real-time streak tracking** — Built-in dashboard shows your current streak, best streak, and weekly calendar.
- **Smart language detection** — Parses Codeforces language tags (GNU C++20, PyPy 3, etc.) and maps them to standard file extensions (.cpp, .py, .js, ...).
- **Cloudflare bypass** — Uses your active Codeforces tab session to fetch source code without triggering Cloudflare blocks.
- **Custom subdirectories** — Organize solutions into a specific folder (e.g., `solutions/`) via the popup settings.
- **Rate-limit aware** — Respects GitHub secondary rate limits and Codeforces API limits with automatic backoff.
- **OAuth authentication** — Secure GitHub OAuth flow via a stateless Vercel broker (no third-party servers see your token).
- **Dashboard analytics** — View your solving stats: current streak, best streak, weekly progress, and Codeforces statistics (rating, rank, problems solved).

---

## Screenshots

| Welcome | GitHub Auth | Repository Setup |
|:-------:|:-----------:|:----------------:|
| ![Welcome](public/UI/page%201%20-%20Welcome.png) | ![GitHub Auth](public/UI/Page%202%20-%20Github%20Connection.png) | ![Repository](public/UI/Page%204%20-%20Repository%20Setup.png) |

| Codeforces Auth | Dashboard | Settings |
|:---------------:|:---------:|:--------:|
| ![Codeforces](public/UI/page%203-%20Codeforces%20Connection.png) | ![Dashboard](public/UI/page%205%20-%20finish%20to%20main%20Dashboard.png) | ![Settings](public/UI/Page%206%20-%20main%20page%20to%20setting%20page.png) |

---

## Installation

### Prerequisites

- **Google Chrome** (102+, required for `chrome.storage.session`) or **Mozilla Firefox** (128+, required for `storage.session` in Firefox) or **Microsoft Edge** (Chromium-based)
- **A GitHub account** with a repository to store solutions
- **A Codeforces account** (the handle you solve problems under)

### Option 1: GitHub Releases (Recommended)

1. Go to the [Releases page](https://github.com/mhdnazrul/CodeforcesSync/releases).
2. Download the latest `CodeforcesSync-vX.X.X.zip`.
3. Extract the ZIP file to a folder on your computer.
4. Open Chrome and navigate to `chrome://extensions`.
5. Enable **Developer mode** (top-right toggle).
6. Click **Load unpacked** and select the extracted folder.
7. The extension is now installed. Pin it to your toolbar for easy access.

### Option 2: Build from Source

```bash
# Clone the repository
git clone https://github.com/mhdnazrul/CodeforcesSync.git
cd CodeforcesSync

# Install dependencies
npm install

# Build the extension
npm run build

# Load dist/ as an unpacked extension in Chrome
```

---

## Configuration

### 1. Create a GitHub Repository

Create a new public or private repository on GitHub (e.g., `Codeforces-Solutions`). This is where your solutions will be uploaded.

### 2. Set Up OAuth

The extension uses GitHub OAuth to authenticate. You need to register an OAuth App:

1. Go to **GitHub Settings → Developer settings → OAuth Apps → New OAuth App**.
2. Set **Application name** to `CodeforcesSync`.
3. Set **Homepage URL** to `https://github.com/<your-username>/CodeforcesSync`.
4. Set **Authorization callback URL** to `https://<your-vercel-deployment>.vercel.app/api/oauth/callback`.
5. Generate a **Client Secret** and note the **Client ID**.
6. Deploy the Vercel broker with these as environment variables (see [Deployment](docs/Deployment.md)).

### 3. Link Your Accounts

Click the CodeforcesSync icon in your Chrome toolbar and follow the onboarding wizard:

1. **Connect GitHub** — Click "Login with GitHub" to start OAuth.
2. **Connect Codeforces** — Enter your Codeforces handle.
3. **Link Repository** — Enter your GitHub repository URL (e.g., `https://github.com/owner/repo` or `owner/repo`).
4. **Done** — The dashboard appears with your stats.

### 4. Start Solving

Keep a Codeforces tab open in your browser while solving. The extension uses your active session to fetch source code and bypass Cloudflare. Solved problems will appear in your repository automatically.

---

## Usage

### Dashboard

The dashboard shows:

- **Current streak** — Consecutive days with at least one accepted submission.
- **Best streak** — Your longest streak ever recorded.
- **Weekly calendar** — A 7-day grid showing which days you solved problems.
- **Codeforces statistics** — Rating, rank, total problems solved, contributions, and friend count (fetched from the official API, cached for 10 minutes).

### Syncing

- The background service worker polls the Codeforces API (`user.status`) every **60 seconds** via Chrome Alarms.
- New accepted submissions are detected, their source code is fetched (via your active CF tab or the RSS feed), and uploaded to your GitHub repository.
- Already-synced submissions are tracked to avoid duplicates.
- If a GitHub API call fails (network error, rate limit), the sync engine retries up to **3 times** with exponential backoff.

### Settings

Access settings from the gear icon in the header:

- **Change repository** — Update the linked GitHub repository.
- **Set subdirectory** — Store solutions in a specific folder.
- **Reset all** — Clear all data and sign out.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                   Chrome Extension (MV3)                     │
│                                                             │
│  ┌──────────┐   ┌───────────┐   ┌───────────────────────┐  │
│  │  Popup   │   │  Service   │   │    Content Scripts    │  │
│  │ (React)  │◄──┤  Worker   │──►│  (injected into CF)   │  │
│  └────┬─────┘   └─────┬─────┘   └───────────────────────┘  │
│       │               │                                     │
│       ▼               ▼                                     │
│  ┌──────────┐   ┌───────────┐                               │
│  │ Settings │   │   Sync    │   ┌──────────────────┐        │
│  │  Store   │   │  Engine   │──►│  GitHub REST API  │        │
│  └──────────┘   └─────┬─────┘   └──────────────────┘        │
│                       │                                     │
│                       ▼                                     │
│              ┌──────────────────┐                            │
│              │  Codeforces API  │                            │
│              │  + RSS Feed      │                            │
│              └──────────────────┘                            │
└─────────────────────────────────────────────────────────────┘
           │
           ▼
  ┌──────────────────┐
  │  Vercel OAuth    │
  │  Broker (auth)   │
  └──────────────────┘
```

### Key Modules

| Module | Location | Purpose |
|--------|----------|---------|
| Background | `src/background/` | Service worker lifecycle, alarm scheduling, message routing |
| Sync Engine | `src/sync/` | Submission polling, deduplication, retry with exponential backoff |
| GitHub | `src/github/` | GitHub REST API client, token management, file upload |
| Codeforces | `src/codeforces/` | Codeforces API client, RSS feed parser |
| Storage | `src/storage/` | Settings persistence with schema versioning |
| Statistics | `src/statistics/` | Streak calculation, weekly calendar computation |
| Browser | `src/browser/` | Abstracts `chrome.*` APIs behind typed interfaces |
| Popup UI | `src/ui/` | React application (dashboard, settings, onboarding) |

See [Architecture](docs/Architecture.md) for detailed documentation.

---

## Project Structure

```
CodeforcesSync/
├── api/oauth/           # Vercel serverless functions for OAuth broker
├── docs/                # Documentation
│   ├── Architecture.md
│   ├── OAuth.md
│   ├── GitHub-Integration.md
│   ├── Codeforces-Integration.md
│   ├── Sync-Engine.md
│   ├── Statistics.md
│   ├── Caching.md
│   ├── Repository-Validation.md
│   ├── Security.md
│   ├── Deployment.md
│   ├── Development.md
│   ├── Release-Guide.md
│   ├── Troubleshooting.md
│   ├── FAQ.md
│   └── Roadmap.md
├── public/              # Static assets (icons, screenshots)
├── src/                 # Source code
│   ├── background/      # Service worker
│   ├── browser/         # Browser API abstraction
│   ├── cfstats/         # Codeforces statistics module
│   ├── codeforces/      # Codeforces API client
│   ├── content/         # Injected content scripts
│   ├── github/          # GitHub API client
│   ├── shared/          # Shared utilities, types, helpers
│   ├── statistics/      # Streak and calendar computation
│   ├── storage/         # Settings persistence
│   ├── sync/            # Sync engine
│   └── ui/              # React popup application
├── .github/             # Issue templates, community files
├── vite.config.ts       # Vite build configuration
├── tsconfig.json        # TypeScript configuration
└── package.json         # Dependencies and scripts
```

---

## Development

```bash
# Install dependencies
npm install

# Development build (watch mode)
npm run dev

# Production build
npm run build

# Lint
npm run lint
```

### Environment Variables

Create a `.env` file in the project root:

```env
VITE_OAUTH_BROKER_URL=https://<your-vercel-deployment>.vercel.app
```

See [Development](docs/Development.md) for detailed setup instructions.

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| **Code not syncing** | Ensure a Codeforces tab is open in your browser. The extension needs your active session to fetch source code. |
| **Cloudflare blocked** | Keep `codeforces.com` actively open. The content script requires the live DOM to extract submission source. |
| **OAuth fails** | Verify your Vercel broker is deployed and environment variables (`GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`) are set correctly. |
| **Statistics not loading** | CF stats are fetched from the official Codeforces API. If the API is down, stats will not load. The extension retries on next poll cycle. |

See [Troubleshooting](docs/Troubleshooting.md) for more details.

---

## FAQ

**Q: Does this work on Firefox?**  
A: Yes. Firefox is fully supported (version 128+).

**Q: Is my GitHub token safe?**  
A: Yes. The token is stored in `chrome.storage.local` and is only accessible to the extension. The OAuth broker is stateless and never stores your token.

**Q: Can I choose which submissions get synced?**  
A: Currently, all accepted verdicts are synced. Selective syncing is on the roadmap.

**Q: What if I solve a problem without a Codeforces tab open?**  
A: The submission won't be synced until the next poll cycle detects it. If the source cannot be fetched via your active tab, the extension falls back to the RSS feed (which does not include source code, only metadata).

See [FAQ](docs/FAQ.md) for more answers.

---

## Limitations

- **Active tab required** for source code fetching — the extension relies on your Codeforces session.
- **Accepted verdicts only** — Only "Accepted" (OK) submissions are synced. Other verdicts are ignored.
- **100K submission limit** — Codeforces API returns a maximum of 100,000 recent submissions. Users with more may see partial statistics.
- **No bulk backfill** — Only submissions made after installation are synced. Historical submissions are not backfilled.

---

## Roadmap

- [ ] Selective syncing (per-contest, per-problem)
- [ ] "Sync Now" button for manual refresh
- [ ] All Submissions Sync (sync all accepted submissions, not just recent)
- [ ] Custom commit messages
- [ ] Chrome Web Store and Firefox Add-ons (AMO) submission
- [ ] Support for other platforms (LeetCode, AtCoder, CodeChef)

See [Roadmap](docs/Roadmap.md) for details.

---

## Security

- GitHub tokens are stored in `chrome.storage.local` — accessible only to the extension.
- OAuth uses PKCE (S256) with a stateless Vercel broker — the broker never sees your access token.
- All communications are HTTPS.
- The extension requests the minimum required permissions (`storage`, `alarms`, `identity`, `scripting`, host permissions).
- No third-party analytics, tracking, or telemetry.

See [Security](docs/Security.md) for the full security model.

---

## Contributing

Contributions are welcome. Please read [CONTRIBUTING.md](CONTRIBUTING.md) and the [Engineering Constitution](docs/ENGINEERING_CONSTITUTION.md) before starting.

1. Fork the repository.
2. Create a feature branch (`git checkout -b feature/amazing-feature`).
3. Commit your changes (`git commit -m 'Add amazing feature'`).
4. Push to the branch (`git push origin feature/amazing-feature`).
5. Open a Pull Request.

---

## License

Distributed under the MIT License. See [LICENSE](LICENSE) for details.

---

<div align="center">
  <p>Made with ❤️ by <a href="https://github.com/mhdnazrul">Nazrul</a></p>
  <p>
    <a href="https://github.com/mhdnazrul/CodeforcesSync">GitHub</a> •
    <a href="https://github.com/mhdnazrul/CodeforcesSync/issues">Issues</a> •
    <a href="https://github.com/mhdnazrul/CodeforcesSync/discussions">Discussions</a>
  </p>
</div>
