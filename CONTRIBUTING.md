# Contributing to CodeforcesSync

Thank you for investing your time in contributing to CodeforcesSync. This document provides guidelines and expectations for contributions.

## Code of Conduct

This project follows the [Contributor Covenant Code of Conduct](CODE_OF_CONDUCT.md). By participating, you agree to uphold its principles.

## Development Philosophy

Read the [Engineering Constitution](docs/ENGINEERING_CONSTITUTION.md) before starting. Key principles:

- **Never break production** — Preserve existing sync, upload, streak, and detection behavior.
- **Small incremental changes** — One commit does one thing.
- **Backward compatibility first** — Old import paths must resolve until the cleanup phase.
- **Pure functions whenever possible** — Side effects pushed to edges of the system.

## Getting Started

### Prerequisites

- Node.js 18+
- npm 9+
- Google Chrome 102+ / Microsoft Edge 102+ / Mozilla Firefox 128+

### Setup

```bash
git clone https://github.com/mhdnazrul/CodeforcesSync.git
cd CodeforcesSync
npm install
npm run build           # Chrome / Edge
npm run build:firefox   # Firefox
```

Load `dist/` as an unpacked extension:
- **Chrome:** `chrome://extensions` → Developer mode → Load unpacked
- **Edge:** `edge://extensions` → Developer mode → Load unpacked
- **Firefox:** `about:debugging#/runtime/this-firefox` → Load Temporary Add-on → select `dist/manifest.json`

## Development Workflow

### Branch Naming

```
feature/<description>
fix/<description>
docs/<description>
```

Examples: `feature/sync-now-button`, `fix/oauth-timeout`, `docs/update-readme`

### Commit Messages

Write clear, imperative commit messages:

```
feat: add Sync Now button to dashboard
fix: resolve OAuth timeout on slow networks
docs: update deployment guide with Vercel instructions
```

### Running Checks

Always run these before opening a pull request:

```bash
npm run lint          # ESLint
npm run build         # TypeScript check + Chrome/Edge production build
npm run build:firefox # TypeScript check + Firefox production build
```

### Architecture Rules

- Domain modules (`github/`, `codeforces/`, `sync/`, `statistics/`) must never import from `browser/` or React.
- The `browser/` layer is the only module that directly calls `chrome.*` APIs.
- All `chrome.*` calls should go through `BrowserAdapter` interfaces.
- No cross-domain imports between `github/` and `codeforces/`.

See [Architecture](docs/Architecture.md) and the [Engineering Constitution](docs/ENGINEERING_CONSTITUTION.md) for complete rules.

## Pull Request Process

1. Ensure your code passes lint and build.
2. Update documentation if you add or change functionality.
3. Update the `CHANGELOG.md` with a brief description of your change.
4. Open a pull request with a clear title and description.
5. A maintainer will review your PR and may request changes.

## Testing

There is no test suite currently. When contributing:

- Manually verify that the extension loads, OAuth works, sync runs, and the dashboard displays correctly.
- Document any manual testing steps in your PR description.

## Documentation

- User-facing changes should update README.md if applicable.
- Architecture changes should update docs/Architecture.md.
- New features should have a dedicated doc page in docs/.

## Questions?

Open a [discussion](https://github.com/mhdnazrul/CodeforcesSync/discussions) or check [SUPPORT.md](docs/SUPPORT.md).
