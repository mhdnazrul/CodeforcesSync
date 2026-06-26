# Changelog

All notable changes to CodeforcesSync are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Settings screen now normalizes repository URLs (full GitHub URLs → `owner/repo`) before saving.
- Platform requirements documentation (Chrome 102+, MV3, official CF APIs, 10-minute stats cache).
- GitHub community health files (CONTRIBUTING, CODE_OF_CONDUCT, SECURITY, SUPPORT, issue templates).
- Comprehensive `docs/` directory with architecture, OAuth, integration, and development guides.

### Changed

- `extractRepoName()` moved from `ApiContext.tsx` to `shared` utilities for reuse across onboarding and settings.
- OAuth error logging consolidated to a single `console.error` call (removed redundant duplicate).
- README.md rewritten with professional project documentation structure.

### Fixed

- Settings screen no longer stores raw GitHub URLs (e.g., `https://github.com/owner/repo`). URLs are normalized to `owner/repo` before saving.

### Security

- Detailed security model documented in `SECURITY.md`.

## [0.0.0] - 2026-06-26

### Added

- Initial release.
- GitHub OAuth authentication via stateless Vercel broker.
- Codeforces API polling every 60 seconds via Chrome Alarms.
- Automatic detection and syncing of accepted ("Accepted") submissions.
- Source code extraction via active Codeforces tab (Cloudflare bypass).
- RSS feed fallback for submission metadata when tab is unavailable.
- GitHub REST API upload with rate-limit awareness and retry logic.
- Dashboard with current streak, best streak, and weekly calendar.
- Codeforces statistics (rating, rank, problems solved, contributions).
- Custom subdirectory support for organizing solutions.
- Smart language detection and file extension mapping.
- Onboarding wizard (GitHub auth → Codeforces handle → repository linking).
- Settings screen for changing repo, subdirectory, and resetting data.
- Popup UI built with React 19, TypeScript, and Tailwind CSS v4.
- MV3 service worker architecture with browser abstraction layer.
- Storage module with schema versioning for future migrations.
