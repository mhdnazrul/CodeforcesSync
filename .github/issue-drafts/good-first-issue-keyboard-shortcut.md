---
name: "Good First Issue: Document keyboard shortcut for opening the extension"
about: "A beginner-friendly documentation task to help users discover the keyboard shortcut."
title: "[Good First Issue] Document keyboard shortcut for opening the extension"
labels: ["good first issue", "documentation"]
---

## Description

Chrome extensions with an action popup can be opened via a configurable keyboard shortcut (`chrome://extensions/shortcuts`). Currently there's no mention of this anywhere in the documentation. Adding a note would help users who prefer keyboard navigation.

## Task

1. Add a section to the FAQ (`docs/FAQ.md`) titled "Is there a keyboard shortcut to open the popup?"
2. Explain that users can set one at `chrome://extensions/shortcuts` → find CodeforcesSync → click the pencil icon → press a key combination.
3. Add the same information to the Troubleshooting guide (`docs/Troubleshooting.md`) under a new "Keyboard Shortcuts" section.

## Acceptance Criteria

- [ ] FAQ entry added with clear instructions.
- [ ] Troubleshooting guide updated with keyboard shortcut section.
- [ ] All existing links in the modified files remain valid.
- [ ] No runtime code is modified.

## Hints

- The default shortcut in Chrome is unset — users must configure it.
- Common choices are `Ctrl+Shift+S`, `Ctrl+Shift+Y`, or `Alt+C`.
