# Release Guide

## Versioning

This project follows [Semantic Versioning](https://semver.org/):

- **MAJOR** — Breaking changes to the API, storage schema, or extension behavior.
- **MINOR** — New features that are backward-compatible.
- **PATCH** — Bug fixes that are backward-compatible.

## Release Process

### 1. Bump Version

Update `<version>` in these files to match the new release:

| File | Field |
|------|-------|
| `package.json` | `"version": "<version>"` |
| `manifest.json` | `"version": "<version>"` |
| `manifest.firefox.json` | `"version": "<version>"` |

### 2. Update Changelog

Update `CHANGELOG.md`:

- Move entries from the **Unreleased** section to a new section titled with the release version and date.
- Categorize changes: Added, Changed, Fixed, Removed.
- Ensure all pull requests and notable changes are documented.

### 3. Commit and Tag

```bash
git add package.json manifest.json manifest.firefox.json CHANGELOG.md
git commit -m "chore: release v<version>"
git tag v<version>
git push origin <branch> --tags
```

### 4. Automated Release

Pushing the tag triggers `.github/workflows/release.yml` on `ubuntu-latest`. The pipeline runs sequentially and stops on any failure:

| Step | Command | Artifact |
|------|---------|----------|
| Lint | `npm run lint` | — |
| Build Chrome | `npm run build` | `dist/` |
| Optimize & rename | `mv dist dist-chrome` | `dist-chrome/` |
| Build Firefox | `npm run build:firefox` | `dist/` |
| Optimize & rename | `mv dist dist-firefox` | `dist-firefox/` |
| Package Chrome | `zip dist-chrome` | `CodeforcesSync-Chrome-<version>.zip` |
| Package Edge | copy Chrome ZIP | `CodeforcesSync-Edge-<version>.zip` |
| Package Firefox | `zip dist-firefox` | `CodeforcesSync-Firefox-<version>.zip` |
| Create Release | `gh release create` | GitHub Release with auto-generated notes + 3 ZIPs |

The release notes are generated automatically from merged pull requests and commits since the last tag. If any step fails, the workflow stops and no release is created. Monitor the run at **Actions** → **Release** in the GitHub repository.

## Post-Release Verification

### Release Asset Verification

1. Go to the [Releases page](https://github.com/mhdnazrul/CodeforcesSync/releases).
2. Confirm the new release appears with `CodeforcesSync-Chrome-<version>.zip`, `CodeforcesSync-Edge-<version>.zip`, and `CodeforcesSync-Firefox-<version>.zip`.
3. **Chrome ZIP**: Extract and check `manifest.json` has no `browser_specific_settings` key.
4. **Edge ZIP**: Must be byte-identical to Chrome ZIP (`sha256sum` match).
5. **Firefox ZIP**: Extract and check `manifest.json` contains `browser_specific_settings.gecko.id`.

### Browser Verification

| Browser | Load via | Verify |
|---------|----------|--------|
| Chrome | `chrome://extensions` → Load unpacked | Popup renders, onboarding flow completes |
| Edge | `edge://extensions` → Load unpacked | Same behavior as Chrome |
| Firefox | `about:debugging#/runtime/this-firefox` → Load Temporary Add-on | Popup renders, service worker starts |

### OAuth Verification

1. Open the extension popup.
2. Click **Login with GitHub**.
3. Complete the OAuth flow in the browser popup window.
4. Confirm the popup navigates to the next onboarding step.
5. Repeat in each supported browser (Chrome, Edge, Firefox).

### Repository Validation

1. During onboarding or in Settings, enter a valid `owner/repo` URL.
2. Confirm the validation spinner appears and resolves to a green checkmark.
3. Enter an invalid URL and confirm an error message is shown.

### Codeforces Statistics

1. Connect a Codeforces handle during onboarding.
2. Open the Dashboard.
3. Confirm statistics load and display (total submissions, AC, WA, TLE, etc.).
4. Confirm the refresh button fetches updated data.

### Sync Verification

1. Solve a problem on Codeforces.
2. Wait up to 1 minute for the background sync to run (alarm fires every 60s).
3. Confirm the submission appears in the linked GitHub repository.
4. Confirm the streak counter increments on the Dashboard.
5. Verify source code extraction produces correct, readable output.

### Dashboard Verification

1. Confirm current streak and best streak display correctly.
2. Confirm the weekly progress grid highlights solved days (green) and missed days (red).
3. Confirm the Statistics Section loads Codeforces data without errors.
4. Navigate to Settings and back — confirm state persists.

### Settings Verification

1. Change the repository URL and save — confirm the change persists on reload.
2. Change the subdirectory and save — confirm the change persists.
3. Click **Reset All** — confirm all data clears and the onboarding wizard restarts.

## Rollback

### Reverting a Release

If a release introduces a critical bug:

1. **Identify the last known-good tag**: `git tag --sort=-creatordate | head -5`
2. **Create a fix commit** for the bug (do not rewrite history).
3. **Cut a patch release**: follow the standard release process for `v<current-patch+1>`.
4. **Mark the broken release as "Pre-release"** on GitHub to signal it should not be used.

If you need to temporarily pull a release:

1. Go to the release on GitHub.
2. Click **Edit**.
3. Check **Set as a pre-release** → **Update release**.

Do not delete releases — users may have downloaded them and rely on checksums.

### Failed GitHub Actions Recovery

| Failure | Diagnosis | Recovery |
|---------|-----------|----------|
| Lint fails | Check linter output for errors | Fix code, commit, delete and re-tag (`git tag -d v<version>; git push origin :refs/tags/v<version>`), push tag again |
| Build fails | Check TypeScript or Vite output | Fix build error, commit, re-tag |
| Release created but assets missing | Check workflow logs | Delete the release, re-run the workflow (if tag exists) or re-tag |
| Release notes are incomplete | The `--generate-notes` flag compares against the last tag | Edit the release on GitHub and add missing notes manually |

To re-run a failed workflow:

1. Push a new tag (e.g., `v<version>` with the fix commit) — the workflow triggers automatically.
2. OR delete the remote tag and push it again: `git push origin :refs/tags/v<version> && git push origin v<version>`

## Hotfix Release Workflow

For urgent fixes that cannot wait for the next scheduled release:

```bash
# 1. Branch from the release tag
git checkout -b hotfix/<description> v<broken-version>

# 2. Apply the fix
git cherry-pick <commit-hash>   # or fix inline

# 3. Bump patch version
#    Edit package.json, manifest.json, manifest.firefox.json

# 4. Update changelog
#    Add entry under a new version section

# 5. Commit and tag
git add -A
git commit -m "hotfix: <description>"
git tag v<new-patch-version>

# 6. Push tag to trigger the release pipeline
git push origin v<new-patch-version>

# 7. Merge back to main
git checkout main
git merge hotfix/<description>
git push origin main
```

## Post-Release QA Checklist

- [ ] Release assets uploaded (3 ZIPs, correct naming)
- [ ] Chrome ZIP manifest has no `browser_specific_settings`
- [ ] Edge ZIP matches Chrome ZIP (same SHA-256)
- [ ] Firefox ZIP has `browser_specific_settings.gecko.id`
- [ ] Extension loads in Chrome without errors
- [ ] Extension loads in Edge without errors
- [ ] Extension loads in Firefox without errors
- [ ] GitHub OAuth flow completes in Chrome
- [ ] GitHub OAuth flow completes in Firefox
- [ ] Repository validation works (valid/invalid repos)
- [ ] Codeforces handle detection works (manual + auto-detect)
- [ ] Codeforces statistics load on Dashboard
- [ ] Background sync starts within 1 minute
- [ ] Accepted submissions appear in GitHub repo
- [ ] Streak counter increments on solved days
- [ ] Dashboard displays correctly (streak, weekly grid, stats)
- [ ] Settings persist across popup reopen
- [ ] Reset All clears data and restarts onboarding
- [ ] Release notes are accurate and complete

## Installation

### Chrome / Edge

1. Download `CodeforcesSync-Chrome-<version>.zip`.
2. Extract to a folder on your computer.
3. Open `chrome://extensions` (Chrome) or `edge://extensions` (Edge).
4. Enable **Developer mode**.
5. Click **Load unpacked** and select the extracted folder.

### Firefox

1. Download `CodeforcesSync-Firefox-<version>.zip`.
2. Extract to a folder on your computer.
3. Open `about:debugging#/runtime/this-firefox`.
4. Click **Load Temporary Add-on** and select the `manifest.json` inside the extracted folder.
