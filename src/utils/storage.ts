import { ChromeStorageService } from "../browser/chrome/adapter";
import { createStore } from "../storage";

export type { AppSettings } from "../storage";
export { defaultSettings } from "../storage";

const { getSettings, saveSettings, clearSettings } = createStore(
  new ChromeStorageService(),
);

export { getSettings, saveSettings, clearSettings };
