import { useState, useEffect } from "react";
import { getSettings, saveSettings, defaultSettings } from "./utils/storage";
import type { AppSettings } from "./utils/storage";
import "./index.css";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const HeaderIcons = ({
  onSettingsClick,
  codeforcesHandle
}: {
  onSettingsClick: () => void,
  codeforcesHandle?: string
}) => (
  <div className="flex items-center gap-3">
    <a
      href="https://github.com/mhdnazrul/CodeforcesSync"
      target="_blank"
      rel="noreferrer"
      className="text-white hover:text-teal-100 transition-colors"
      title="GitHub Source"
    >
      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
        <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
      </svg>
    </a>
    <a
      href={codeforcesHandle ? `https://codeforces.com/profile/${codeforcesHandle}` : "https://codeforces.com"}
      target="_blank"
      rel="noreferrer"
      className="text-white hover:text-teal-100 transition-colors"
      title="Codeforces Profile"
    >
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    </a>
    <button
      onClick={onSettingsClick}
      className="text-white hover:text-teal-100 transition-colors cursor-pointer"
      title="Settings"
    >
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    </button>
  </div>
);

function App() {
  const [settings, setSettings] = useState<AppSettings>(defaultSettings);
  const [showSettings, setShowSettings] = useState(false);
  const [saveStatus, setSaveStatus] = useState("");

  const isAuthenticated = !!settings.githubToken && !!settings.githubUsername;
  const repoLinked = !!settings.githubRepo;
  const githubRepoCombo = settings.githubRepo
    ? `${settings.githubUsername}/${settings.githubRepo}`
    : "";

  useEffect(() => {
    const refreshSettings = () => {
      getSettings().then(setSettings);
    };

    refreshSettings();

    // Listen for sync success messages from background to refresh UI in real-time
    const listener = (message: any) => {
      if (message.type === "SYNC_SUCCESS") {
        console.log("CodeforcesSync: Sync success received, refreshing UI...");
        refreshSettings();
      }
    };

    chrome.runtime.onMessage.addListener(listener);
    return () => chrome.runtime.onMessage.removeListener(listener);
  }, []);

  const handleChange = (key: keyof AppSettings, value: any) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    setSaveStatus("Saving...");
    await saveSettings(settings);
    setSaveStatus("Saved successfully!");
    setTimeout(() => {
      setSaveStatus("");
      setShowSettings(false);
    }, 1500);
  };

  const getWeeklyProgress = () => {
    const now = new Date();
    const currentDay = now.getDay(); // 0 is Sunday
    const progress = [];

    for (let i = 0; i < 7; i++) {
      const date = new Date(now);
      date.setDate(now.getDate() - (currentDay - i));
      const dateStr = new Date(date.getTime() - date.getTimezoneOffset() * 60000)
        .toISOString()
        .split("T")[0];

      const solved = settings.solvedDays?.includes(dateStr);
      const isFuture = date > now;

      progress.push({
        day: DAYS[i],
        solved,
        isFuture,
        isToday: i === currentDay,
      });
    }
    return progress;
  };

  const weeklyProgress = getWeeklyProgress();
  const isFireActive = settings.lastAcceptedDate === new Date(new Date().getTime() - new Date().getTimezoneOffset() * 60000).toISOString().split("T")[0];

  if (showSettings) {
    return (
      <div className="flex flex-col h-full bg-white animate-in fade-in duration-300">
        <div className="bg-[#0d9488] p-4 flex items-center justify-between shadow-md">
          <h1 className="text-white font-bold text-lg">Settings</h1>
          <button
            onClick={() => setShowSettings(false)}
            className="text-white hover:bg-white/10 p-1 rounded transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-5 flex-1 overflow-y-auto space-y-6">
          <section className="space-y-3">
            <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest px-1">GitHub Authentication</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1 ml-1">Username</label>
                <input
                  type="text"
                  value={settings.githubUsername}
                  onChange={(e) => handleChange("githubUsername", e.target.value)}
                  placeholder="@yourusername"
                  className="w-full text-sm bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-slate-800 transition-all focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1 ml-1">Access Token</label>
                <input
                  type="password"
                  value={settings.githubToken}
                  onChange={(e) => handleChange("githubToken", e.target.value)}
                  placeholder="ghp_************************"
                  className="w-full text-sm bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-slate-800 transition-all focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none"
                />
              </div>
            </div>
          </section>

          <section className="space-y-3 pt-2 border-t border-slate-100">
            <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest px-1">System Profile</h2>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1 ml-1">Codeforces Handle</label>
              <input
                type="text"
                value={settings.codeforcesHandle}
                onChange={(e) => handleChange("codeforcesHandle", e.target.value)}
                placeholder="e.g. tourist"
                className="w-full text-sm bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-slate-800 transition-all focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none"
              />
            </div>
          </section>

          <section className="space-y-3 pt-2 border-t border-slate-100">
            <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest px-1">Target Repository</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1 ml-1">Repository Name</label>
                <input
                  type="text"
                  value={settings.githubRepo}
                  onChange={(e) => handleChange("githubRepo", e.target.value)}
                  placeholder="e.g. Codeforces-Solutions"
                  className="w-full text-sm bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-slate-800 transition-all focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none"
                />
              </div>

              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-100">
                <span className="text-sm font-medium text-slate-600">Use Subdirectory</span>
                <button
                  onClick={() => handleChange("useSubdirectory", !settings.useSubdirectory)}
                  className={`w-10 h-5 rounded-full transition-colors relative ${settings.useSubdirectory ? 'bg-teal-500' : 'bg-slate-300'}`}
                >
                  <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${settings.useSubdirectory ? 'left-6' : 'left-1'}`} />
                </button>
              </div>

              {settings.useSubdirectory && (
                <div className="animate-in slide-in-from-top-2 duration-200">
                  <label className="block text-xs font-semibold text-slate-700 mb-1 ml-1">Path Name</label>
                  <input
                    type="text"
                    value={settings.subdirectoryName}
                    onChange={(e) => handleChange("subdirectoryName", e.target.value)}
                    placeholder="solutions"
                    className="w-full text-sm bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-slate-800 transition-all focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none"
                  />
                </div>
              )}
            </div>
          </section>
        </div>

        <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
          <span className="text-xs font-bold text-teal-600 px-2">{saveStatus}</span>
          <button
            onClick={handleSave}
            className="bg-teal-600 hover:bg-teal-700 text-white text-sm font-bold py-2.5 px-8 rounded-lg transition-all shadow-md active:scale-95 cursor-pointer"
          >
            Apply Changes
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col bg-white">
      {/* HEADER */}
      <div className="bg-[#0d9488] p-5 flex items-center justify-between rounded-t-2xl shadow-lg">
        <h1 className="text-white font-bold text-xl tracking-tight">CodeForcesSync</h1>
        <HeaderIcons
          onSettingsClick={() => setShowSettings(true)}
          codeforcesHandle={settings.codeforcesHandle}
        />
      </div>

      <div className="p-6 space-y-5">
        {/* STREAK CARD */}
        <div className="streak-card rounded-2xl p-5 relative overflow-hidden group">
          <div className="flex items-center gap-6 mb-6">
            <div className={`w-16 h-16 rounded-2xl flex items-center justify-center transition-all duration-500 shadow-lg ${isFireActive ? 'bg-orange-500 scale-105' : 'bg-slate-200 grayscale'}`}>
              <svg className={`w-10 h-10 ${isFireActive ? 'text-white animate-pulse-soft' : 'text-slate-400'}`} fill="currentColor" viewBox="0 0 24 24">
                <path d="M12.916 2.326c-.114-.11-.277-.123-.406-.032C9.28 4.544 6.75 7.07 6.1 11.08c-.28 1.73-.005 3.19.78 4.394C5.07 14.28 4.5 12.35 4.5 10.5c0-.28-.22-.51-.5-.51s-.5.23-.5.51c0 3.1 1.76 5.86 4.37 7.23C7.31 18.23 7 18.83 7 19.5c0 1.38 1.12 2.5 2.5 2.5s2.5-1.12 2.5-2.5c0-.3-.05-.59-.15-.86.91.43 1.93.86 3.11.86.69 0 1.35-.56 1.35-1.25 0-.54-.34-.92-.7-.92-.3 0-.58.15-.81.39C13.68 18.3 12.5 17 12.5 15.5c0-.44.2-.84.52-1.12 1.32.96 3.48.96 4.8 0 .32.28.52.68.52 1.12 0 1.5-1.18 2.8-2.31 2.22-.23-.24-.51-.39-.81-.39-.36 0-.7.38-.7.92 0 .69.66 1.25 1.35 1.25 1.18 0 2.2-.43 3.11-.86-.1.27-.15.56-.15.86 0 1.38 1.12 2.5 2.5 2.5s2.5-1.12 2.5-2.5c0-.67-.31-1.27-.87-1.77 2.61-1.37 4.37-4.13 4.37-7.23s-1.89-5.12-4.17-6.31c-.13-.07-.29-.07-.41.01s-.19.21-.17.36c.26 1.74-.26 3.25-1.42 4.49-.09.09-.13.23-.1.35.25.9-.06 1.83-.82 2.59-.09.09-.23.11-.35.05s-.17-.18-.12-.31c.47-1.24.23-2.67-.65-3.69-.09-.1-.23-.15-.36-.12-.13.03-.23.13-.26.26-.26 1.24-1.01 2.28-1.92 2.89-.13-.04-.26-.1-.38-.17V2.326z" />
              </svg>
            </div>
            <div>
              <div className="flex items-baseline gap-2">
                <span className="text-6xl font-black text-slate-800 tracking-tighter tabular-nums">{settings.currentStreak || 0}</span>
                <span className="text-xl font-bold text-slate-600 tracking-wide">DAY STREAK</span>
              </div>
              <p className="text-slate-500 font-medium ml-1">Keep it going! 🚀</p>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-1 ml-1">
            {weeklyProgress.map((day) => (
              <div key={day.day} className="flex flex-col items-center gap-2">
                <span className="text-[10px] font-bold text-slate-500 uppercase">{day.day}</span>
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-300 ${day.solved
                  ? 'bg-[#10b981] text-white shadow-md'
                  : (day.isFuture
                    ? 'bg-slate-100/50 border border-dashed border-slate-300'
                    : 'bg-[#f43f5e] text-white shadow-md')
                  } ${day.isToday ? 'ring-2 ring-offset-2 ring-teal-500' : ''}`}>
                  {day.solved ? (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (!day.isFuture && (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* CONNECTION CARD */}
        <div className="bg-slate-50/50 border border-slate-100 rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-slate-600 font-bold text-sm">GitHub Connection</span>
            <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${isAuthenticated ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
              }`}>
              <span className={`w-1.5 h-1.5 rounded-full ${isAuthenticated ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`}></span>
              {isAuthenticated ? 'Connected' : 'Disconnected'}
            </div>
          </div>

          <div className="flex items-center justify-between group cursor-pointer" onClick={() => repoLinked && window.open(`https://github.com/${githubRepoCombo}`, '_blank')}>
            <span className="text-slate-600 font-bold text-sm">Repository</span>
            <span className="text-teal-600 font-black text-sm hover:underline flex items-center gap-1">
              {repoLinked ? (settings.githubRepo) : 'Not configured'}
              {repoLinked && (
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              )}
            </span>
          </div>
        </div>

        {/* FOOTER */}
        <div className="pt-2 text-center space-y-2">
          <p className="text-xs text-slate-400 font-medium">
            Having Issues? <a href="https://github.com/mhdnazrul/CodeforcesSync/issues/new/choose" target="_blank" rel="noreferrer" className="text-teal-600 font-bold hover:underline">Report Us</a>
          </p>
          <p className="text-xs text-slate-400 font-medium pb-2">
            Made with <span className="text-rose-500 animate-bounce inline-block">❤️</span> by <a href="https://github.com/mhdnazrul" target="_blank" rel="noreferrer" className="text-teal-600 font-bold hover:underline">@mhdnazrul</a>
          </p>
        </div>
      </div>
    </div>
  );
}

export default App;
