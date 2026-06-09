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
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
          return;
        }
        resolve(items as unknown as AppSettings);
      }
    );
  });
};

/**
 * Save (partial) settings to Chrome Storage.
 */
export const saveSettings = async (
  settings: Partial<AppSettings>
): Promise<void> => {
  return new Promise((resolve, reject) => {
    chrome.storage.local.set(settings, () => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
        return;
      }
      resolve();
    });
  });
};

/**
 * Clear all settings from Chrome Storage (Logout).
 */
export const clearSettings = async (): Promise<void> => {
  return new Promise((resolve, reject) => {
    chrome.storage.local.clear(() => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
        return;
      }
      resolve();
    });
  });
};
