import { useState, useEffect } from "react";
import { getSettings, saveSettings, defaultSettings } from "./utils/storage";
import type { AppSettings } from "./utils/storage";
import "./index.css";

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
    getSettings().then(setSettings);
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

  if (showSettings) {
    return (
      <div className="w-80 min-h-[400px] bg-gray-900 text-white font-sans p-5 border border-gray-800 shadow-2xl flex flex-col">
        <div className="flex items-center justify-between mb-4 border-b border-gray-800 pb-3">
          <h1 className="text-lg font-bold text-gray-100">Settings</h1>
          <button
            onClick={() => setShowSettings(false)}
            className="text-gray-400 hover:text-white transition-colors cursor-pointer text-xl leading-none"
          >
            &times;
          </button>
        </div>

        <div className="space-y-4 flex-1 overflow-y-auto pr-1">
          <div className="space-y-3">
            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
              GitHub Auth
            </h2>
            <div>
              <label className="block text-xs font-medium mb-1 text-gray-300">
                Username
              </label>
              <input
                type="text"
                value={settings.githubUsername}
                onChange={(e) => handleChange("githubUsername", e.target.value)}
                placeholder="e.g. mbD24"
                className="w-full text-sm bg-gray-800 border border-gray-700 rounded p-1.5 text-white focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1 text-gray-300">
                Personal Access Token
              </label>
              <input
                type="password"
                value={settings.githubToken}
                onChange={(e) => handleChange("githubToken", e.target.value)}
                placeholder="ghp_..."
                className="w-full text-sm bg-gray-800 border border-gray-700 rounded p-1.5 text-white focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          <div className="space-y-3 pt-2 border-t border-gray-800">
            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
              Account Settings
            </h2>
            <div>
              <label className="block text-xs font-medium mb-1 text-gray-300">
                Codeforces Handle
              </label>
              <input
                type="text"
                value={settings.codeforcesHandle}
                onChange={(e) =>
                  handleChange("codeforcesHandle", e.target.value)
                }
                placeholder="e.g. tourist"
                className="w-full text-sm bg-gray-800 border border-gray-700 rounded p-1.5 text-white focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          <div className="space-y-3 pt-2 border-t border-gray-800">
            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
              Repository
            </h2>
            <div>
              <label className="block text-xs font-medium mb-1 text-gray-300">
                Repo Name
              </label>
              <input
                type="text"
                value={settings.githubRepo}
                onChange={(e) => handleChange("githubRepo", e.target.value)}
                placeholder="e.g. codeforces-solutions"
                className="w-full text-sm bg-gray-800 border border-gray-700 rounded p-1.5 text-white focus:outline-none focus:border-blue-500"
              />
            </div>

            <label className="flex items-center gap-2 cursor-pointer mt-2">
              <input
                type="checkbox"
                checked={settings.useSubdirectory}
                onChange={(e) =>
                  handleChange("useSubdirectory", e.target.checked)
                }
                className="rounded bg-gray-800 border-gray-700 text-blue-500"
              />
              <span className="text-xs text-gray-300">Use Subdirectory</span>
            </label>

            {settings.useSubdirectory && (
              <div className="mt-1">
                <input
                  type="text"
                  value={settings.subdirectoryName}
                  onChange={(e) =>
                    handleChange("subdirectoryName", e.target.value)
                  }
                  placeholder="e.g. solutions"
                  className="w-full text-sm bg-gray-800 border border-gray-700 rounded p-1.5 text-white focus:outline-none focus:border-blue-500"
                />
              </div>
            )}
          </div>
        </div>

        <div className="pt-4 border-t border-gray-800 mt-2 flex items-center justify-between">
          <span className="text-xs text-green-400">{saveStatus}</span>
          <button
            onClick={handleSave}
            className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium py-1.5 px-4 rounded transition-colors cursor-pointer"
          >
            Save
          </button>
        </div>
      </div>
    );
  }

  // DASHBOARD VIEW
  return (
    <div className="w-80 min-h-[300px] bg-gray-900 text-white font-sans p-5 border border-gray-800 shadow-2xl flex flex-col">
      <div className="flex items-center justify-between mb-4 border-b border-gray-800 pb-3">
        <h1 className="text-lg font-bold bg-gradient-to-r from-blue-400 to-blue-600 bg-clip-text text-transparent">
          CodeforcesSync
        </h1>
        <button
          onClick={() => setShowSettings(true)}
          className="text-gray-400 hover:text-white transition-colors cursor-pointer"
          title="Settings"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
            />
          </svg>
        </button>
      </div>

      <div className="flex flex-col items-center justify-center mb-6 py-4 bg-gray-800/50 rounded-lg border border-gray-700">
        <div className="text-3xl mb-1">🔥</div>
        <div className="text-2xl font-bold text-orange-400">
          {settings.currentStreak || 0}
        </div>
        <div className="text-xs text-gray-400 uppercase tracking-wider font-semibold mt-1">
          Day Streak
        </div>
      </div>

      <div className="space-y-3 flex-1">
        <div className="bg-gray-800 rounded p-3 border border-gray-700">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-gray-400">GitHub Connection</span>
            {isAuthenticated ? (
              <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-green-400">
                <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse"></span>
                Connected
              </span>
            ) : (
              <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-red-400">
                <span className="w-1.5 h-1.5 rounded-full bg-red-400"></span>
                Disconnected
              </span>
            )}
          </div>

          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-400">Repository</span>
            {repoLinked ? (
              <span
                className="text-xs text-blue-400 truncate max-w-[140px] font-medium"
                title={githubRepoCombo}
              >
                {githubRepoCombo.split("/")[1] || githubRepoCombo}
              </span>
            ) : (
              <span className="text-xs text-gray-500">Not configured</span>
            )}
          </div>
        </div>
      </div>

      {!isAuthenticated && (
        <button
          onClick={() => setShowSettings(true)}
          className="mt-4 w-full bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold py-2 rounded transition-colors cursor-pointer"
        >
          Authenticate GitHub
        </button>
      )}

      <div className="mt-4 pt-3 border-t border-gray-800 text-center flex items-center justify-between">
        <span className="text-[10px] text-gray-500">Codeforces to GitHub</span>
        <a
          href={repoLinked ? `https://github.com/${githubRepoCombo}` : "#"}
          target="_blank"
          rel="noreferrer"
          className="text-[10px] text-blue-400 hover:text-blue-300"
        >
          View Repo &rarr;
        </a>
      </div>
    </div>
  );
}

export default App;
