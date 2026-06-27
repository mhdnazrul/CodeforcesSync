---
name: "Help Wanted: Implement manual 'Sync Now' button on dashboard"
about: "An intermediate task to add a user-requested feature: on-demand sync trigger."
title: "[Help Wanted] Add 'Sync Now' button to manually trigger a sync cycle"
labels: ["help wanted", "enhancement"]
---

## Description

Currently the extension syncs automatically every 60 seconds via Chrome Alarms. Users frequently request a way to trigger a sync immediately without waiting. A "Sync Now" button on the Dashboard would solve this.

## Background

The sync engine (`src/sync/index.ts`) already exposes a `runSync()` function that performs a full sync cycle. The service worker listens for messages via `browserApi.runtime.onMessage`. The missing piece is:

- A new message type (e.g., `TRIGGER_SYNC`) sent from the popup to the service worker.
- A handler in `src/background/background.ts` that calls the existing sync worker when the message is received.
- A button in the Dashboard UI (`src/ui/screens/DashboardScreen.tsx`) that sends the message.

## Task

1. Add a `MANUAL_SYNC` message type to the message protocol in `src/background/background.ts` (see lines 144–181 for existing message handlers).
2. When received, call `runSyncWorker(...)` with the existing services (same as the alarm handler does on line 39–50). The sync worker is already wired via `startScheduler`.
3. Add a "Sync Now" button to `src/ui/screens/DashboardScreen.tsx`. Show it near the streak display. Disable it while a sync is in progress to prevent double-triggers.
4. Send a loading indicator while the sync runs. On completion, refresh the dashboard settings (same pattern as `OAUTH_COMPLETE` handler in ApiContext.tsx line 72–78).
5. Handle errors gracefully: if the sync fails, show an error toast or inline message (don't throw an unhandled exception).

## Acceptance Criteria

- [ ] Clicking "Sync Now" triggers a sync cycle immediately.
- [ ] The button is disabled while a sync is already running.
- [ ] The dashboard refreshes after sync completes (new submissions appear in streak).
- [ ] Errors are displayed to the user without crashing the popup.
- [ ] The existing 60-second alarm is not affected (alarm still fires, but `isSyncing` guard in `runSync` prevents double sync).
- [ ] `npm run lint` and `npm run build` pass.

## Architecture Rules

- Do NOT modify the sync engine core (`src/sync/index.ts`) beyond what's needed for the new message type.
- The browser abstraction layer (`src/browser/`) must not be modified.
- OAuth flow must not be affected.

## Related Files

- `src/background/background.ts` — service worker entry, message routing, line 144–181
- `src/background/syncWorker.ts` — wires service worker components to `runSync()`
- `src/ui/contexts/ApiContext.tsx` — popup state management, message listeners
- `src/ui/screens/DashboardScreen.tsx` — dashboard UI where the button would appear

## Design Reference

The button should be small and secondary (not the primary CTA). Suggested: a small refresh-style button next to the streak header or in the sync status area. Refer to `src/ui/components/Button.tsx` for the existing button component.
