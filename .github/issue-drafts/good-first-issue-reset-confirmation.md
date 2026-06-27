---
name: "Good First Issue: Add confirmation dialog before 'Reset All'"
about: "A beginner-friendly UI task to prevent accidental data loss."
title: "[Good First Issue] Add confirmation dialog before 'Reset All' in Settings"
labels: ["good first issue", "enhancement"]
---

## Description

The Settings screen has a "Reset All" button that clears all data (GitHub token, Codeforces handle, sync history, streak data) with no confirmation. A single accidental click wipes everything. Adding a browser-native `confirm()` dialog would prevent this.

## Task

1. Locate the reset handler in `src/ui/contexts/ApiContext.tsx` (the `resetAll` function, ~line 119).
2. Before calling `store.clearSettings()`, show a `confirm()` dialog:
   - Message: "This will clear all data including your GitHub token, Codeforces handle, and sync history. This cannot be undone. Continue?"
3. If the user cancels, do nothing.
4. If they confirm, proceed with the existing reset logic.

## Acceptance Criteria

- [ ] Clicking "Reset All" shows a confirmation dialog.
- [ ] Cancelling the dialog does nothing (no data cleared).
- [ ] Confirming the dialog clears all data and restarts onboarding (existing behavior preserved).
- [ ] `npm run lint` and `npm run build` pass.

## Hints

- Use `window.confirm()` — it's synchronous, cross-browser, and requires no new dependencies.
- The existing `resetAll` function is async; `confirm()` should be called before the first `await`.
