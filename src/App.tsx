import { useState, useEffect } from "react";
import { getSettings, saveSettings, defaultSettings } from "./utils/storage";
import type { AppSettings } from "./utils/storage";
import "./index.css";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

// ─── Header icons ──────────────────────────────────────────────────────────────
function HeaderIcons({
  onSettingsClick,
  codeforcesHandle,
}: {
  onSettingsClick: () => void;
  codeforcesHandle?: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <a
        href="https://github.com/mhdnazrul/CodeforcesSync"
        target="_blank"
        rel="noreferrer"
        className="text-white/80 hover:text-white transition-colors"
        title="GitHub Source"
      >
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
        </svg>
      </a>
      <a
        href={
          codeforcesHandle
            ? `https://codeforces.com/profile/${codeforcesHandle}`
            : "https://codeforces.com"
        }
        target="_blank"
        rel="noreferrer"
        className="text-white/80 hover:text-white transition-colors"
        title="Codeforces Profile"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
          />
        </svg>
      </a>
      <button
        onClick={onSettingsClick}
        className="text-white/80 hover:text-white transition-colors cursor-pointer"
        title="Settings"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
          />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
          />
        </svg>
      </button>
    </div>
  );
}

// ─── Toggle switch ─────────────────────────────────────────────────────────────
function Toggle({ on, onChange }: { on: boolean; onChange: () => void }) {
  return (
    <button
      role="switch"
      aria-checked={on}
      onClick={onChange}
      className={`w-10 h-5 rounded-full transition-colors relative focus:outline-none focus:ring-2 focus:ring-teal-400 focus:ring-offset-1 ${
        on ? "bg-teal-500" : "bg-slate-300"
      }`}
    >
      <div
        className={`absolute top-1 w-3 h-3 bg-white rounded-full shadow transition-all duration-200 ${
          on ? "left-6" : "left-1"
        }`}
      />
    </button>
  );
}

// ─── Local date helper (mirrors background.ts) ─────────────────────────────────
function toLocalDateString(date: Date): string {
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000)
    .toISOString()
    .split("T")[0];
}

// ─── Weekly progress ───────────────────────────────────────────────────────────
function getWeeklyProgress(solvedDays: string[] = []) {
  const now = new Date();
  const currentDay = now.getDay(); // 0 = Sunday
  return DAYS.map((day, i) => {
    const date = new Date(now);
    date.setDate(now.getDate() - (currentDay - i));
    const dateStr = toLocalDateString(date);
    return {
      day,
      dateStr,
      solved: solvedDays.includes(dateStr),
      isFuture: date > now,
      isToday: i === currentDay,
    };
  });
}

// ─── App ───────────────────────────────────────────────────────────────────────
export default function App() {
  const [settings, setSettings] = useState<AppSettings>(defaultSettings);
  const [showSettings, setShowSettings] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">("idle");

  const isAuthenticated = !!settings.githubToken && !!settings.githubUsername;
  const repoLinked = !!settings.githubRepo;
  const todayStr = toLocalDateString(new Date());
  const isFireActive = settings.lastAcceptedDate === todayStr;
  const weeklyProgress = getWeeklyProgress(settings.solvedDays);

  useEffect(() => {
    getSettings().then(setSettings);

    const listener = (message: { type: string }) => {
      if (message.type === "SYNC_SUCCESS") {
        getSettings().then(setSettings);
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

  // ── Settings view ────────────────────────────────────────────────────────────
  if (showSettings) {
    return (
      <div className="flex flex-col h-full bg-white">
        {/* Settings header */}
        <div className="bg-gradient-to-r from-teal-600 to-teal-500 px-5 py-4 flex items-center justify-between shadow-md">
          <h1 className="text-white font-bold text-lg tracking-tight">Settings</h1>
          <button
            onClick={() => setShowSettings(false)}
            className="text-white/80 hover:text-white hover:bg-white/10 p-1.5 rounded-lg transition-all"
            title="Close"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Settings body */}
        <div className="p-5 flex-1 overflow-y-auto space-y-5">
          {/* GitHub Auth */}
          <section>
            <h2 className="settings-section-label">GitHub Authentication</h2>
            <div className="space-y-3 mt-3">
              <div>
                <label className="settings-label">Username</label>
                <input
                  type="text"
                  value={settings.githubUsername}
                  onChange={(e) => handleChange("githubUsername", e.target.value)}
                  placeholder="@yourusername"
                  className="settings-input"
                />
              </div>
              <div>
                <label className="settings-label">Access Token</label>
                <input
                  type="password"
                  value={settings.githubToken}
                  onChange={(e) => handleChange("githubToken", e.target.value)}
                  placeholder="ghp_************************"
                  className="settings-input"
                />
              </div>
            </div>
          </section>

          <div className="section-divider" />

          {/* Codeforces */}
          <section>
            <h2 className="settings-section-label">Codeforces</h2>
            <div className="mt-3">
              <label className="settings-label">Handle</label>
              <input
                type="text"
                value={settings.codeforcesHandle}
                onChange={(e) => handleChange("codeforcesHandle", e.target.value)}
                placeholder="e.g. tourist"
                className="settings-input"
              />
            </div>
          </section>

          <div className="section-divider" />

          {/* Repository */}
          <section>
            <h2 className="settings-section-label">Target Repository</h2>
            <div className="space-y-3 mt-3">
              <div>
                <label className="settings-label">Repository Name</label>
                <input
                  type="text"
                  value={settings.githubRepo}
                  onChange={(e) => handleChange("githubRepo", e.target.value)}
                  placeholder="e.g. Codeforces-Solutions"
                  className="settings-input"
                />
              </div>

              <div className="flex items-center justify-between px-3 py-2.5 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-sm font-medium text-slate-600">Use Subdirectory</span>
                <Toggle
                  on={settings.useSubdirectory}
                  onChange={() => handleChange("useSubdirectory", !settings.useSubdirectory)}
                />
              </div>

              {settings.useSubdirectory && (
                <div className="animate-in slide-in-from-top-1 duration-150">
                  <label className="settings-label">Path Name</label>
                  <input
                    type="text"
                    value={settings.subdirectoryName}
                    onChange={(e) => handleChange("subdirectoryName", e.target.value)}
                    placeholder="solutions"
                    className="settings-input"
                  />
                </div>
              )}
            </div>
          </section>
        </div>

        {/* Save footer */}
        <div className="px-5 py-4 border-t border-slate-100 bg-slate-50/70 flex items-center justify-between gap-3">
          <span className={`text-xs font-semibold transition-opacity ${saveStatus === "saved" ? "text-teal-600 opacity-100" : "opacity-0"}`}>
            ✓ Saved successfully!
          </span>
          <button
            onClick={handleSave}
            disabled={saveStatus === "saving"}
            className="btn-primary ml-auto"
          >
            {saveStatus === "saving" ? "Saving…" : "Apply Changes"}
          </button>
        </div>
      </div>
    );
  }

  // ── Main view ────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col bg-white">
      {/* Header */}
      <div className="bg-gradient-to-r from-teal-600 to-teal-500 px-5 py-4 flex items-center justify-between shadow-lg">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
          </div>
          <h1 className="text-white font-bold text-lg tracking-tight">CodeforcesSync</h1>
        </div>
        <HeaderIcons
          onSettingsClick={() => setShowSettings(true)}
          codeforcesHandle={settings.codeforcesHandle}
        />
      </div>

      <div className="p-5 space-y-4">
        {/* Streak card */}
        <div className="streak-card rounded-2xl p-5 relative overflow-hidden">
          {/* Decorative background orb */}
          <div className="absolute -right-6 -top-6 w-28 h-28 rounded-full bg-amber-200/30 blur-2xl pointer-events-none" />

          <div className="flex items-center gap-5 mb-5">
            {/* Fire icon */}
            <div
              className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-md transition-all duration-500 ${
                isFireActive
                  ? "bg-gradient-to-br from-orange-400 to-rose-500 scale-105"
                  : "bg-slate-200 grayscale"
              }`}
            >
              <svg
                className={`w-8 h-8 ${isFireActive ? "text-white animate-pulse-soft" : "text-slate-400"}`}
                fill="currentColor"
                viewBox="0 0 24 24"
              >
                <path d="M12 23a7.5 7.5 0 01-5.138-12.963C8.204 8.774 11.5 6.5 11 1.5c5.5 4 9 8.5 6.5 12 2.5-.5 3.5-3 3.5-3 1 2.5-.5 6.5-3 8.5A7.484 7.484 0 0112 23z" />
              </svg>
            </div>

            <div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-5xl font-black text-slate-800 tracking-tighter tabular-nums leading-none">
                  {settings.currentStreak || 0}
                </span>
                <span className="text-base font-bold text-slate-500 tracking-wide">
                  DAY STREAK
                </span>
              </div>
              <p className="text-sm text-slate-500 font-medium mt-1">
                {isFireActive ? "🔥 You solved today!" : "⏳ Solve a problem to continue!"}
              </p>
            </div>
          </div>

          {/* Weekly activity grid */}
          <div className="grid grid-cols-7 gap-1">
            {weeklyProgress.map((day) => (
              <div key={day.day} className="flex flex-col items-center gap-1.5">
                <span className="text-[9px] font-bold text-slate-400 uppercase">{day.day}</span>
                <div
                  title={day.dateStr}
                  className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-300 ${
                    day.isFuture
                      ? "bg-slate-100 border border-dashed border-slate-200"
                      : day.solved
                      ? "bg-emerald-500 text-white shadow-sm shadow-emerald-200"
                      : "bg-rose-400 text-white shadow-sm shadow-rose-200"
                  } ${day.isToday ? "ring-2 ring-offset-1 ring-teal-500" : ""}`}
                >
                  {!day.isFuture && (
                    day.solved ? (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    ) : (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    )
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* GitHub connection card */}
        <div className="bg-white border border-slate-100 rounded-2xl p-4 space-y-3 shadow-sm">
          {/* Connection status */}
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-slate-700">GitHub</span>
            <div
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                isAuthenticated
                  ? "bg-emerald-50 text-emerald-700 border border-emerald-100"
                  : "bg-rose-50 text-rose-700 border border-rose-100"
              }`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  isAuthenticated ? "bg-emerald-500 animate-pulse" : "bg-rose-400"
                }`}
              />
              {isAuthenticated ? "Connected" : "Disconnected"}
            </div>
          </div>

          {/* Username row */}
          {isAuthenticated && (
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-400 font-medium">Account</span>
              <span className="text-xs font-semibold text-slate-600">@{settings.githubUsername}</span>
            </div>
          )}

          {/* Repository row */}
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-medium">Repository</span>
            {repoLinked ? (
              <button
                onClick={() =>
                  window.open(
                    `https://github.com/${settings.githubUsername}/${settings.githubRepo}`,
                    "_blank"
                  )
                }
                className="flex items-center gap-1 text-xs font-semibold text-teal-600 hover:text-teal-700 hover:underline transition-colors"
              >
                {settings.githubRepo}
                <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5}
                    d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                  />
                </svg>
              </button>
            ) : (
              <button
                onClick={() => setShowSettings(true)}
                className="text-xs font-semibold text-slate-400 hover:text-teal-600 transition-colors"
              >
                Configure →
              </button>
            )}
          </div>

          {/* Auto-sync indicator */}
          <div className="flex items-center gap-1.5 pt-1 border-t border-slate-50">
            <span className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-pulse" />
            <span className="text-[10px] text-slate-400 font-medium">Auto-sync active · checks every minute</span>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center space-y-1 pt-1">
          <p className="text-xs text-slate-400">
            Having issues?{" "}
            <a
              href="https://github.com/mhdnazrul/CodeforcesSync/issues/new/choose"
              target="_blank"
              rel="noreferrer"
              className="text-teal-600 font-semibold hover:underline"
            >
              Report a bug
            </a>
          </p>
          <p className="text-xs text-slate-400 pb-1">
            Made with{" "}
            <span className="text-rose-500 animate-pulse-soft inline-block">❤️</span>{" "}
            by{" "}
            <a
              href="https://github.com/mhdnazrul"
              target="_blank"
              rel="noreferrer"
              className="text-teal-600 font-semibold hover:underline"
            >
              @mhdnazrul
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
