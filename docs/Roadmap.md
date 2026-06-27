# Roadmap

This document outlines planned features and improvements for CodeforcesSync. Items are ordered by priority.

## Short-Term

- [ ] **Chrome Web Store / Firefox Add-ons (AMO) submission** — Package the extension for store distribution to enable one-click installation and automatic updates.
- [ ] **"Sync Now" button** — Add a manual sync button to the dashboard so users can trigger an immediate sync cycle without waiting for the 60-second alarm.

## Medium-Term

- [ ] **All Submissions Sync** — Sync all accepted submissions from the user's Codeforces history, not just submissions made after installation. This requires paginating through the Codeforces API to fetch all historical submissions.
- [ ] **Selective syncing** — Allow users to choose which contests or problems to sync (per-contest toggle, per-problem toggle).
- [ ] **Custom commit messages** — Allow users to customize the commit message format (e.g., include problem rating, tags, or a personal message).

## Long-Term

- [ ] **Multi-platform support** — Support syncing from other competitive programming platforms (LeetCode, AtCoder, CodeChef, HackerRank).
- [ ] **Sync status indicators** — Show sync status per-submission in the dashboard (pending, syncing, synced, failed).
- [ ] **Submission history view** — Browse synced submissions from the dashboard.
- [ ] **Language stats** — Show a breakdown of solved problems by programming language.
- [ ] **Dark mode** — Add a dark theme to the popup.
- [ ] **Notifications** — Show desktop notifications when a submission is synced.
- [ ] **i18n** — Internationalization support for non-English users.

## Completed

- [x] **Initial release** (v0.0.0) — Basic extension with OAuth, sync engine, dashboard, and settings.
- [x] **Phase 1-12 Architecture Migration** — Complete migration to modular architecture with browser abstraction, storage schema, and pure domain modules.
- [x] **Repository URL normalization** — Full GitHub URLs are normalized to `owner/repo` format before saving.
- [x] **Settings URL validation** — Settings screen now normalizes repo URLs the same way as onboarding.
- [x] **AbortController for CF stats** — Shared AbortController prevents orphaned API requests.
- [x] **RSS fetch timeout** — RSS fallback fetch has a 15-second timeout to prevent hanging.
- [x] **GitHub API timeouts** — Configurable timeouts per operation (10s GET, 30s PUT).
- [x] **Project documentation** — Comprehensive README, docs directory, community health files.
- [x] **Firefox cross-browser support** — Ported to Firefox with separate manifest, build config, and OAuth compatibility.

## Not Planned

- **Watch mode** — Watching specific files or directories. The extension is focused on syncing Codeforces submissions, not file system monitoring.
- **GitHub Actions integration** — The extension uses the GitHub REST API directly. CI/CD integrations are out of scope.
- **Offline support** — The extension requires network access to fetch from Codeforces and push to GitHub. Offline mode is not planned.
