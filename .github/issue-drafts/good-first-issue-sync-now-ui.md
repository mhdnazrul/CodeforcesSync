---
name: "Good First Issue: Add hover tooltip to dashboard sync indicator"
about: "A beginner-friendly UI task to improve the dashboard's sync status display."
title: "[Good First Issue] Add hover tooltip to dashboard sync indicator"
labels: ["good first issue", "enhancement"]
---

## Description

The Dashboard screen currently shows sync-related information in text form. Users frequently ask "when was the last sync?" or "is it running right now?". Adding a small tooltip on hover would answer these questions without cluttering the UI.

## Task

1. Locate the Dashboard component at `src/ui/screens/DashboardScreen.tsx`.
2. Find the section that displays sync status or the current streak header.
3. Add a `title` attribute (native HTML tooltip) to the relevant element showing:
   - "Sync runs every 60 seconds via background alarms"
   - Or the last sync tick time if available from storage.
4. Style the tooltip with Tailwind classes for consistency (e.g., `cursor-help` on the element).

## Acceptance Criteria

- [ ] A tooltip appears on hover over the sync indicator.
- [ ] The tooltip text describes the sync interval.
- [ ] No new dependencies are introduced.
- [ ] `npm run lint` and `npm run build` pass.

## Hints

- HTML `title` attribute is the simplest approach and works cross-browser.
- If you want a styled tooltip, check if Tailwind's `group` utility is available.
