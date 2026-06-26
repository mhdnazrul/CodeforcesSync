import type { AlarmsService } from "../shared/types/browser";

export function startScheduler(alarms: AlarmsService, onTick: () => void): void {
  alarms.get("codeforces-sync").then((existing) => {
    if (!existing) {
      alarms.create("codeforces-sync", { periodInMinutes: 1 });
    }
  });

  alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === "codeforces-sync") {
      console.log("CodeforcesSync: Running background sync interval…");
      onTick();
    }
  });
}
