# Screenshots

The following screenshots show the CodeforcesSync extension in action.

## Onboarding Flow

| Screen | Description | Location |
|--------|-------------|----------|
| Welcome | Initial welcome screen with "Get Started" button | `public/UI/page 1 - Welcome.png` |
| GitHub Auth | "Login with GitHub" button | `public/UI/Page 2 - Github Connection.png` |
| Codeforces Auth | Enter Codeforces handle | `public/UI/page 3- Codeforces Connection.png` |
| Repository Setup | Enter repository URL | `public/UI/Page 4 - Repository Setup.png` |

## Dashboard

| Screen | Description | Location |
|--------|-------------|----------|
| Dashboard | Main dashboard with streaks and CF stats | `public/UI/page 5 - finish to main Dashboard.png` |

## Settings

| Screen | Description | Location |
|--------|-------------|----------|
| Settings | Change repo, set subdirectory, reset all | `public/UI/Page 6 - main page to setting page.png` |

## Asset Files

| File | Purpose |
|------|---------|
| `public/img/connected.png` | Dashboard connected state |
| `public/img/disconnected.png` | Dashboard disconnected state |
| `public/img/settings.png` | Settings screen |
| `public/icons/icon16.png` | Extension icon (16px) |
| `public/icons/icon48.png` | Extension icon (48px) |
| `public/icons/icon128.png` | Extension icon (128px) |
| `public/logos/logo*.png` | Project logos at various resolutions |

## Updating Screenshots

When updating UI, regenerate screenshots to keep the documentation current:

1. Load the extension in Chrome.
2. Navigate through each screen.
3. Capture screenshots at the popup's native size (400x600px).
4. Save to `public/UI/` with descriptive filenames.
5. Update this document.
