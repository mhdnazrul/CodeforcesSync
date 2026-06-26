import React, { createContext, useContext, useState, useEffect } from "react";
import { ChromeStorageService } from "../../browser/chrome/adapter";
import { createStore, defaultSettings } from "../../storage";
import { getWeeklyProgress } from "../../statistics";
import type { AppSettings } from "../../storage";

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
  isOnboarded: boolean;
  isLoading: boolean;
  onboardingStep: string;
  setOnboardingStep: (step: string) => void;
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
    bestStreak: 0, // TODO: Compute from historical data once backend tracks it
    weeklyProgress: rawWeekly.map((d, i) => ({ ...d, day: SHORT_DAY_LABELS[i] })),
    solvedPieData: [], // TODO: Fetch aggregate submission stats from Codeforces API
    submissions: { tle: 0, wa: 0, rte: 0, mle: 0 }, // TODO: Fetch from Codeforces API
    totalAC: 0, // TODO: Fetch total accepted count from Codeforces API
  };
}

export function ApiProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [onboardingStep, setOnboardingStepState] = useState<string>("welcome");

  const isOnboarded = !!(settings?.githubRepo && settings?.codeforcesHandle);

  useEffect(() => {
    store.getSettings().then((s) => {
      setSettings(s);
      setStats(buildStats(s));
      setIsLoading(false);
    });
  }, []);

  useEffect(() => {
    const listener = (message: { type: string }) => {
      if (message.type === "SYNC_SUCCESS" || message.type === "TOKEN_EXPIRED") {
        store.getSettings().then((s) => {
          setSettings(s);
          setStats(buildStats(s));
        });
      }
    };
    chrome.runtime.onMessage.addListener(listener);
    return () => chrome.runtime.onMessage.removeListener(listener);
  }, []);

  const setOnboardingStep = (step: string) => {
    setOnboardingStepState(step);
  };

  const connectGitHub = async () => {
    // TODO: Replace with real GitHub OAuth flow.
    // This function exists as a placeholder — the OAuth redirect will set
    // githubToken and githubUsername. For now the user can configure these
    // in the Settings screen directly.
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
    setOnboardingStepState("");
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
    setOnboardingStepState("welcome");
  };

  return (
    <ApiContext.Provider
      value={{
        settings,
        stats,
        isOnboarded,
        isLoading,
        onboardingStep,
        setOnboardingStep,
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

function extractRepoName(input: string): string {
  const trimmed = input.trim();
  if (!trimmed) return trimmed;
  const match = trimmed.match(/^(?:https?:\/\/)?(?:www\.)?github\.com\/([^/]+)\/([^/#.?]+)/);
  return match ? match[2] : trimmed;
}
