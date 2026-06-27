---
name: "Good First Issue: Add CI build status badge to README"
about: "A beginner-friendly task to add a GitHub Actions status badge."
title: "[Good First Issue] Add CI build status badge to README"
labels: ["good first issue", "documentation"]
---

## Description

The README has badges for version, license, TypeScript version, React version, stars, and forks — but no badge showing the CI build status. Adding one signals that the project is actively maintained and gives visitors confidence in the code quality.

## Task

1. Open the README.md file.
2. Locate the badges section (lines 7–14).
3. Add a new badge linking to the latest `npm run build` workflow run, using a shield.io dynamic badge URL.

Suggested format:

```
<a href="https://github.com/mhdnazrul/CodeforcesSync/actions"><img src="https://img.shields.io/github/actions/workflow/status/mhdnazrul/CodeforcesSync/release.yml?style=for-the-badge&logo=github" alt="Build Status"/></a>
```

4. Verify the badge renders correctly by viewing the README on your fork.

## Acceptance Criteria

- [ ] A build status badge appears in the README badges section.
- [ ] The badge links to the Actions page of the repository.
- [ ] `npm run lint` and `npm run build` pass.

## Resources

- GitHub Actions badge docs: https://docs.github.com/en/actions/monitoring-and-troubleshooting-workflows/adding-a-workflow-status-badge
- Shield.io badge syntax: https://shields.io/badges/git-hub-actions-workflow-status
