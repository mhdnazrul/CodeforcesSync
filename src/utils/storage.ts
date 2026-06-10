export interface AppSettings {
  githubToken: string;
  githubUsername: string;
  githubRepo: string;
  useSubdirectory: boolean;
  subdirectoryName: string;
  currentStreak: number;
  lastAcceptedDate: string | null;
  codeforcesHandle: string;
  syncedSubmissions: string[];
  solvedDays: string[];
}

export const defaultSettings: AppSettings = {
  githubToken: "",
  githubUsername: "",
  githubRepo: "",
  useSubdirectory: false,
  subdirectoryName: "solutions",
  currentStreak: 0,
  lastAcceptedDate: null,
  codeforcesHandle: "",
  syncedSubmissions: [],
  solvedDays: [],
};

/**
 * Get all extension settings from Chrome Storage.
 *
 * Checks chrome.runtime.lastError after every operation to detect quota limits,
 * permission errors, or other storage failures. Never silently fails.
 *
 * chrome.storage.local.get() merges the returned object with the defaults
 * object, so every key is guaranteed to be present in the result even if it
 * was never written.  The cast is safe because we pass `defaultSettings` as
 * the template and the returned shape matches `AppSettings` exactly.
 */
export const getSettings = async (): Promise<AppSettings> => {
  return new Promise((resolve, reject) => {
    chrome.storage.local.get(
      defaultSettings as unknown as Record<string, unknown>,
      (items) => {
        const error = chrome.runtime.lastError;
        if (error) {
          const msg = `CodeforcesSync: Storage read error: ${error.message}`;
          console.error(msg);
          reject(new Error(msg));
          return;
        }
        if (!items || typeof items !== "object") {
          const msg = "CodeforcesSync: Storage returned invalid object";
          console.error(msg, items);
          reject(new Error(msg));
          return;
        }
        resolve(items as unknown as AppSettings);
      }
    );
  });
};

/**
 * Save (partial) settings to Chrome Storage.
 *
 * Checks chrome.runtime.lastError to catch quota limits or permission failures.
 * If storage is full, throws immediately so the caller knows the save failed.
 */
export const saveSettings = async (
  settings: Partial<AppSettings>
): Promise<void> => {
  if (!settings || typeof settings !== "object") {
    throw new Error("CodeforcesSync: saveSettings received invalid settings object");
  }

  return new Promise((resolve, reject) => {
    chrome.storage.local.set(settings, () => {
      const error = chrome.runtime.lastError;
      if (error) {
        const msg = `CodeforcesSync: Storage write error: ${error.message}`;
        console.error(msg, settings);
        reject(new Error(msg));
        return;
      }
      resolve();
    });
  });
};

/**
 * Clear all settings from Chrome Storage (Logout).
 *
 * Checks chrome.runtime.lastError to detect storage failures.
 */
export const clearSettings = async (): Promise<void> => {
  return new Promise((resolve, reject) => {
    chrome.storage.local.clear(() => {
      const error = chrome.runtime.lastError;
      if (error) {
        const msg = `CodeforcesSync: Storage clear error: ${error.message}`;
        console.error(msg);
        reject(new Error(msg));
        return;
      }
      resolve();
    });
  });
};
