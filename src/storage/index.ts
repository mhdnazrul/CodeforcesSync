import type { StorageService } from "../shared/types/browser";

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

export const SCHEMA_VERSION = 1;

export function createStore(storage: StorageService) {
  async function getSettings(): Promise<AppSettings> {
    try {
      const raw = await storage.get(
        defaultSettings as unknown as Record<string, unknown>,
      );

      const version =
        typeof raw.schemaVersion === "number" ? raw.schemaVersion : 0;
      if (version < SCHEMA_VERSION) {
        raw.schemaVersion = SCHEMA_VERSION;
        await storage.set(raw);
      }

      if (typeof raw.schemaVersion !== "undefined") {
        delete raw.schemaVersion;
      }
      return raw as unknown as AppSettings;
    } catch (e: unknown) {
      const msg =
        e instanceof Error
          ? `CodeforcesSync: Storage read error: ${e.message}`
          : "CodeforcesSync: Storage read error: Unknown error";
      console.error(msg);
      throw new Error(msg);
    }
  }

  async function saveSettings(
    settings: Partial<AppSettings>,
  ): Promise<void> {
    if (!settings || typeof settings !== "object") {
      throw new Error(
        "CodeforcesSync: saveSettings received invalid settings object",
      );
    }

    try {
      await storage.set({
        ...settings,
        schemaVersion: SCHEMA_VERSION,
      });
    } catch (e: unknown) {
      const msg =
        e instanceof Error
          ? `CodeforcesSync: Storage write error: ${e.message}`
          : "CodeforcesSync: Storage write error: Unknown error";
      console.error(msg, settings);
      throw new Error(msg);
    }
  }

  async function clearSettings(): Promise<void> {
    try {
      await storage.clear();
    } catch (e: unknown) {
      const msg =
        e instanceof Error
          ? `CodeforcesSync: Storage clear error: ${e.message}`
          : "CodeforcesSync: Storage clear error: Unknown error";
      console.error(msg);
      throw new Error(msg);
    }
  }

  return { getSettings, saveSettings, clearSettings };
}
