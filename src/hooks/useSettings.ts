import { useState, useEffect } from "react";
import { ChromeStorageService } from "../browser/chrome/adapter";
import { createStore, defaultSettings } from "../storage";
import type { AppSettings } from "../storage";

const { getSettings, saveSettings } = createStore(new ChromeStorageService());

const GITHUB_URL_RE = /^(?:https?:\/\/)?(?:www\.)?github\.com\/([^/]+)\/([^/#.?]+)/;
const URL_RE = /^(?:https?:\/\/)?[\w.-]+\.\w+\//;

function extractRepo(input: string): { repo: string; error: string | null } {
  const trimmed = input.trim();
  if (!trimmed) return { repo: "", error: null };

  const isUrl = URL_RE.test(trimmed);
  if (!isUrl) return { repo: trimmed, error: null };

  const match = trimmed.match(GITHUB_URL_RE);
  if (match) return { repo: match[2], error: null };

  const domain = trimmed.match(URL_RE)?.[0].replace(/\/\/$/, "");
  return {
    repo: trimmed,
    error: `Enter a repository name, not a ${domain || "non-GitHub"} URL.`,
  };
}

export function useSettings() {
  const [settings, setSettings] = useState<AppSettings>(defaultSettings);
  const [showSettings, setShowSettings] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">("idle");
  const [tokenExpired, setTokenExpired] = useState(false);
  const [repoError, setRepoError] = useState<string | null>(null);

  useEffect(() => {
    void getSettings().then(setSettings);

    const listener = (message: { type: string }) => {
      if (message.type === "SYNC_SUCCESS") {
        void getSettings().then(setSettings);
      }
      if (message.type === "TOKEN_EXPIRED") {
        setTokenExpired(true);
        void getSettings().then(setSettings);
      }
    };
    chrome.runtime.onMessage.addListener(listener);
    return () => chrome.runtime.onMessage.removeListener(listener);
  }, []);

  const handleChange = (key: keyof AppSettings, value: AppSettings[keyof AppSettings]) => {
    if (key === "githubRepo") {
      const { repo, error } = extractRepo(value as string);
      setRepoError(error);
      setSettings((prev) => ({ ...prev, githubRepo: repo }));
      return;
    }
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    setSaveStatus("saving");
    await saveSettings(settings);
    setSaveStatus("saved");
    setTimeout(() => {
      setSaveStatus("idle");
      setShowSettings(false);
    }, 1400);
  };

  return { settings, showSettings, setShowSettings, saveStatus, tokenExpired, repoError, handleChange, handleSave };
}
