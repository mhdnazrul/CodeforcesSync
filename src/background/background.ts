import { ChromeTabsService, ChromeScriptingService, ChromeRuntimeService, ChromeAlarmsService } from "../browser/chrome/adapter";
import { github } from "../utils/githubAPI";
import { getSettings, saveSettings } from "../utils/storage";
import { createRetryEngine } from "../sync";
import type { SyncStorage } from "../sync";
import { startScheduler } from "./scheduler";
import { runSyncWorker } from "./syncWorker";

const alarms = new ChromeAlarmsService();
const tabs = new ChromeTabsService();
const scripting = new ChromeScriptingService();
const runtime = new ChromeRuntimeService();

const retry = createRetryEngine();
const storage: SyncStorage = { getSettings, saveSettings };

startScheduler(alarms, () => {
  runSyncWorker(
    tabs,
    scripting,
    runtime,
    (username, repo, path, contentBase64, message) =>
      github.uploadFile(username, repo, path, contentBase64, message),
    storage,
    retry,
  ).catch((e) =>
    console.error("CodeforcesSync: Top-level sync exception:", e)
  );
});
