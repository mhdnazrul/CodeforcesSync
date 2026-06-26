import { ChromeStorageService } from "../browser/chrome/adapter";
import { createStore } from "../storage";
import { GithubHandler } from "../github";
import type { GithubCredentialStore } from "../github";

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

const github = new GithubHandler(credentialStore, () => {
  chrome.runtime.sendMessage({ type: "TOKEN_EXPIRED" }).catch(() => {});
});

export { github };
