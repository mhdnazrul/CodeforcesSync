# Development Guide

## Prerequisites

- Node.js 18+
- npm 9+
- Google Chrome 102+ / Microsoft Edge 102+ / Mozilla Firefox 128+

## Setup

```bash
# Clone the repository
git clone https://github.com/mhdnazrul/CodeforcesSync.git
cd CodeforcesSync

# Install dependencies
npm install

# Build the extension
npm run build
```

Load `dist/` as an unpacked extension:
- **Chrome:** `chrome://extensions` → Developer mode → Load unpacked
- **Edge:** `edge://extensions` → Developer mode → Load unpacked
- **Firefox:** Build with `npm run build:firefox`, then open `about:debugging#/runtime/this-firefox` → Load Temporary Add-on → select `dist/manifest.json`

## Development Builds

### Watch Mode

```bash
npm run dev
```

This runs `vite build --watch`, which rebuilds on file changes. After each rebuild, reload the extension in your browser's extension manager.

### Production Builds

```bash
npm run build          # Chrome / Edge
npm run build:firefox  # Firefox
```

These run `tsc -b` (TypeScript type checking) followed by `vite build` (production bundle) with the appropriate manifest.

## Linting

```bash
npm run lint
```

The project uses ESLint with TypeScript rules. The lint configuration is in `eslint.config.js` (flat config).

## Available Scripts

| Script | Command | Description |
|--------|---------|-------------|
| `dev` | `vite build --emptyOutDir --watch` | Development build with watch mode |
| `build` | `tsc -b && vite build --emptyOutDir` | Chrome/Edge production build |
| `build:firefox` | `tsc -b && vite build --emptyOutDir --config vite.config.firefox.ts` | Firefox production build |
| `lint` | `eslint .` | Run ESLint on all files |
| `preview` | `vite preview` | Preview the production build |

## Project Structure

```
src/
├── background/       # Service worker (alarms, sync, message routing)
├── browser/          # Browser API abstraction (Chrome adapter)
├── cfstats/          # Codeforces statistics fetching
├── codeforces/       # Codeforces API client
├── content/          # Content scripts injected into CF pages
├── github/           # GitHub REST API client
├── hooks/            # React custom hooks
├── shared/           # Shared utilities, types, formatters
├── statistics/       # Streak and calendar computation
├── storage/          # Settings persistence
├── sync/             # Sync engine
└── ui/               # React popup application
    ├── components/   # Reusable UI components
    ├── contexts/     # React contexts
    ├── screens/      # Screen components
    └── utils/        # UI utilities
```

## Key Files

### Configuration

| File | Purpose |
|------|---------|
| `vite.config.ts` | Vite build configuration, CRXJS plugin, Tailwind plugin |
| `tsconfig.json` | TypeScript configuration (references app and node configs) |
| `tsconfig.app.json` | TypeScript config for the React app source |
| `tsconfig.node.json` | TypeScript config for Node.js code (Vite config, API functions) |
| `vercel.json` | Vercel serverless function configuration |
| `package.json` | Dependencies, scripts, metadata |

### Extension

| File | Purpose |
|------|---------|
| `public/manifest.json` | Chrome Extension manifest for CRXJS (auto-generated) |
| `src/background/background.ts` | Service worker entry point |
| `src/main.tsx` | React entry point |
| `src/App.tsx` | Root React component |
| `src/index.css` | Tailwind CSS styles |

## Environment Variables

Create a `.env` file in the project root:

```env
VITE_OAUTH_BROKER_URL=https://<your-vercel-deployment>.vercel.app
```

This variable is embedded at build time by Vite. It tells the extension where to find the OAuth broker for GitHub authentication.

## Architecture Rules

When developing, follow these rules:

1. **Domain modules** (`github/`, `codeforces/`, `sync/`, `statistics/`) must never import from `browser/` or React.
2. **Browser abstraction** (`src/browser/`) is the only module that directly calls `chrome.*` APIs.
3. **No cross-domain imports** between `github/` and `codeforces/`.
4. **Pure functions** — side effects should be pushed to the edges of the system.
5. **Error handling** — Never swallow errors in empty `catch` blocks. Log errors with the `CodeforcesSync:` prefix.

## Testing

There is no test suite currently. Manual testing steps:

1. Load the extension in Chrome.
2. Verify the onboarding flow works (GitHub auth → CF handle → repo link).
3. Open the dashboard and verify streaks and CF stats load.
4. Submit a solution on Codeforces and verify it syncs to GitHub.
5. Test the settings screen (change repo, set subdirectory, reset all).

## Debugging

### Service Worker Logs

1. Open `chrome://extensions`.
2. Find CodeforcesSync.
3. Click **Service Worker** (blue link under "Inspect views").
4. The DevTools console shows all service worker logs.

### Popup Logs

Right-click the extension icon → **Inspect popup** → The DevTools console shows popup logs.

### OAuth Debugging

Open `chrome://identity-internals` to see cached OAuth tokens.
