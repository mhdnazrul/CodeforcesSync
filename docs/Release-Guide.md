# Release Guide

## Versioning

This project follows [Semantic Versioning](https://semver.org/):

- **MAJOR** — Breaking changes to the API, storage schema, or extension behavior.
- **MINOR** — New features that are backward-compatible.
- **PATCH** — Bug fixes that are backward-compatible.

## Release Process

### 1. Update Version

Update the version in `package.json`:

```json
{
  "version": "1.0.0"
}
```

### 2. Update Changelog

Update `CHANGELOG.md`:

- Move changes from "Unreleased" to the new version section.
- Add the release date.
- Ensure all changes are documented.

### 3. Commit and Tag

```bash
git add package.json CHANGELOG.md
git commit -m "chore: release v1.0.0"
git tag v1.0.0
git push origin main --tags
```

### 4. Build

```bash
npm ci
npm run lint
npm run build
```

Ensure there are no lint errors and the build completes successfully.

### 5. Create Release ZIP

```bash
cd dist
zip -r ../CodeforcesSync-v1.0.0.zip .
```

### 6. Create GitHub Release

1. Go to the [Releases page](https://github.com/mhdnazrul/CodeforcesSync/releases).
2. Click **Draft a new release**.
3. Select the tag you just pushed.
4. Title: `v1.0.0`
5. Description:
   - Summary of changes (can reference CHANGELOG.md).
   - Installation instructions.
   - Link to the full changelog.
6. Attach the ZIP file.
7. **Set as latest release** (if it is the latest).
8. Publish.

### 7. Verify Release

1. Download the ZIP from the release.
2. Extract it.
3. Load it as an unpacked extension in Chrome.
4. Run through the onboarding flow.
5. Verify sync works.

## Release Notes Template

```markdown
## CodeforcesSync v1.0.0

Full changelog: [CHANGELOG.md](https://github.com/mhdnazrul/CodeforcesSync/blob/main/CHANGELOG.md)

### New in This Release

- Feature 1
- Feature 2
- Bug fix 1

### Installation

1. Download the `CodeforcesSync-v1.0.0.zip` asset below.
2. Extract the ZIP to a folder on your computer.
3. Open Chrome and navigate to `chrome://extensions`.
4. Enable **Developer mode**.
5. Click **Load unpacked** and select the extracted folder.

### Checksums

| File | SHA-256 |
|------|---------|
| `CodeforcesSync-v1.0.0.zip` | `abc123...` |
```

## Automated Releases

The project includes a GitHub Actions workflow (`.github/release.yml`) that:

1. Triggers on tags matching `v*.*.*`.
2. Runs `npm ci`, `npm run build`, `npm run lint`.
3. Zips the `dist/` directory.
4. Creates a GitHub Release with the ZIP attached.
5. Generates release notes automatically.

To use automated releases, push a semver tag:

```bash
git tag v1.0.0
git push origin v1.0.0
```

## Pre-Release Checklist

- [ ] All changes committed and pushed.
- [ ] Changelog updated with all changes.
- [ ] Version bumped in `package.json`.
- [ ] `npm run lint` passes.
- [ ] `npm run build` produces clean output.
- [ ] Extension loads in Chrome without errors.
- [ ] OAuth flow works end-to-end.
- [ ] Sync cycle runs on schedule.
- [ ] Dashboard displays correctly.
- [ ] Settings save and load correctly.
- [ ] Reset All clears data correctly.
