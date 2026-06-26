import { ChromeStorageService, ChromeTabsService, ChromeScriptingService, ChromeRuntimeService, ChromeAlarmsService } from "../browser/chrome/adapter";
import { createStore } from "../storage";
import { createRetryEngine } from "../sync";
import { GithubHandler } from "../github";
import type { GithubCredentialStore } from "../github";
import type { SyncStorage } from "../sync";
import { startScheduler } from "./scheduler";
import { runSyncWorker } from "./syncWorker";

const store = createStore(new ChromeStorageService());

const credentialStore: GithubCredentialStore = {
  getToken: async () => {
    const s = await store.getSettings();
    return s.githubToken || null;
  },
  saveToken: async (token, username) => {
    await store.saveSettings({ githubToken: token, githubUsername: username });
  },
  clear: async () => {
    await store.clearSettings();
  },
};

const runtime = new ChromeRuntimeService();
const github = new GithubHandler(credentialStore, () => {
  runtime.sendMessage({ type: "TOKEN_EXPIRED" }).catch(() => {});
});

const alarms = new ChromeAlarmsService();
const tabs = new ChromeTabsService();
const scripting = new ChromeScriptingService();

const retry = createRetryEngine();
const storage: SyncStorage = { getSettings: store.getSettings, saveSettings: store.saveSettings };

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
