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
 * Get all extension settings from Chrome Storage
 */
export const getSettings = async (): Promise<AppSettings> => {
  return new Promise((resolve) => {
    chrome.storage.local.get(
      defaultSettings as Record<string, any>,
      (items) => {
        resolve(items as unknown as AppSettings);
      },
    );
  });
};

/**
 * Save settings to Chrome Storage
 */
export const saveSettings = async (
  settings: Partial<AppSettings>,
): Promise<void> => {
  return new Promise((resolve) => {
    chrome.storage.local.set(settings, () => {
      resolve();
    });
  });
};

/**
 * Clear all settings from Chrome Storage (Logout)
 */
export const clearSettings = async (): Promise<void> => {
  return new Promise((resolve) => {
    chrome.storage.local.clear(() => {
      resolve();
    });
  });
};
