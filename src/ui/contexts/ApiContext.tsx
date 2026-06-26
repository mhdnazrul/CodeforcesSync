import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { ChromeStorageService } from "../../browser/chrome/adapter";
import { createStore, defaultSettings } from "../../storage";
import { getWeeklyProgress } from "../../statistics";
import { extractRepoName } from "../utils/errors";
import type { AppSettings } from "../../storage";
import type { CfStats } from "../../cfstats";

interface Stats {
  currentStreak: number;
  bestStreak: number;
  weeklyProgress: { day: string; dateStr: string; solved: boolean; isFuture: boolean; isToday: boolean }[];
  solvedPieData: { name: string; value: number; color: string }[];
  submissions: { tle: number; wa: number; rte: number; mle: number };
  totalAC: number;
}

export interface ApiContextType {
  settings: AppSettings | null;
  stats: Stats | null;
  cfStats: CfStats | null;
  cfStatsLoading: boolean;
  cfStatsError: string | null;
  refreshCfStats: () => Promise<void>;
  isOnboarded: boolean;
  isLoading: boolean;
  connectGitHub: () => Promise<void>;
  connectCodeforces: (handle: string) => Promise<void>;
  linkRepository: (url: string, subdirectory: string) => Promise<void>;
  saveSettings: (newSettings: Partial<AppSettings>) => Promise<void>;
  resetAll: () => Promise<void>;
}

const ApiContext = createContext<ApiContextType | undefined>(undefined);

const store = createStore(new ChromeStorageService());

const SHORT_DAY_LABELS = ["S", "M", "T", "W", "T", "F", "S"];

function buildStats(s: AppSettings): Stats {
  const rawWeekly = getWeeklyProgress(s.solvedDays);
  return {
    currentStreak: s.currentStreak,
    bestStreak: s.bestStreak || 0,
    weeklyProgress: rawWeekly.map((d, i) => ({ ...d, day: SHORT_DAY_LABELS[i] })),
    solvedPieData: [],
    submissions: { tle: 0, wa: 0, rte: 0, mle: 0 },
    totalAC: 0,
  };
}

export function ApiProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [cfStats, setCfStats] = useState<CfStats | null>(null);
  const [cfStatsLoading, setCfStatsLoading] = useState(false);
  const [cfStatsError, setCfStatsError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const isOnboarded = !!(settings?.githubToken && settings?.githubRepo && settings?.codeforcesHandle);

  useEffect(() => {
    store.getSettings().then((s) => {
      setSettings(s);
      setStats(buildStats(s));
      setIsLoading(false);
    });
  }, []);

  useEffect(() => {
    const listener = (message: { type: string }) => {
      if (message.type === "SYNC_SUCCESS" || message.type === "TOKEN_EXPIRED" || message.type === "OAUTH_COMPLETE") {
        store.getSettings().then((s) => {
          setSettings(s);
          setStats(buildStats(s));
        });
      }
    };
    chrome.runtime.onMessage.addListener(listener);
    return () => chrome.runtime.onMessage.removeListener(listener);
  }, []);

  const connectGitHub = async () => {
    const response = await chrome.runtime.sendMessage({ type: "OAUTH_START" });
    if (!response || response.error) throw new Error(response?.error || "OAuth failed");
    const s = await store.getSettings();
    setSettings(s);
    setStats(buildStats(s));
  };

  const connectCodeforces = async (handle: string) => {
    if (!handle.trim()) throw new Error("Handle required");
    await store.saveSettings({ codeforcesHandle: handle.trim() });
    const s = await store.getSettings();
    setSettings(s);
    setStats(buildStats(s));
  };

  const linkRepository = async (url: string, subdirectory: string) => {
    const repo = extractRepoName(url);
    await store.saveSettings({
      githubRepo: repo,
      useSubdirectory: !!subdirectory,
      subdirectoryName: subdirectory,
    });
    const s = await store.getSettings();
    setSettings(s);
    setStats(buildStats(s));
  };

  const saveSettingsFn = async (newSettings: Partial<AppSettings>) => {
    await store.saveSettings(newSettings);
    const s = await store.getSettings();
    setSettings(s);
    setStats(buildStats(s));
  };

  const resetAll = async () => {
    await store.clearSettings();
    setSettings(defaultSettings);
    setStats(buildStats(defaultSettings));
    setCfStats(null);
    setCfStatsLoading(false);
    setCfStatsError(null);
  };

  const refreshCfStats = useCallback(async () => {
    if (!settings?.codeforcesHandle) return;
    setCfStatsLoading(true);
    setCfStatsError(null);
    try {
      const response = await chrome.runtime.sendMessage({
        type: "FETCH_CF_STATS",
        handle: settings.codeforcesHandle,
      });
      if (response?.success && response.stats) {
        setCfStats(response.stats);
      } else {
        setCfStatsError(response?.error || "Failed to fetch statistics");
      }
    } catch {
      setCfStatsError("Failed to fetch statistics");
    } finally {
      setCfStatsLoading(false);
    }
  }, [settings?.codeforcesHandle]);

  return (
    <ApiContext.Provider
      value={{
        settings,
        stats,
        cfStats,
        cfStatsLoading,
        cfStatsError,
        refreshCfStats,
        isOnboarded,
        isLoading,
        connectGitHub,
        connectCodeforces,
        linkRepository,
        saveSettings: saveSettingsFn,
        resetAll,
      }}
    >
      {children}
    </ApiContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useApi() {
  const context = useContext(ApiContext);
  if (context === undefined) {
    throw new Error("useApi must be used within an ApiProvider");
  }
  return context;
}


