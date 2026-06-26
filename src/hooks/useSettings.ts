import { useState, useEffect } from "react";
import { getSettings, saveSettings, defaultSettings } from "../utils/storage";
import type { AppSettings } from "../utils/storage";

export function useSettings() {
  const [settings, setSettings] = useState<AppSettings>(defaultSettings);
  const [showSettings, setShowSettings] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">("idle");
  const [tokenExpired, setTokenExpired] = useState(false);

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

  return { settings, showSettings, setShowSettings, saveStatus, tokenExpired, handleChange, handleSave };
}
