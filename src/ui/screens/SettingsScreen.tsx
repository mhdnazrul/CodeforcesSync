import React, { useState } from "react";
import Header from "../components/Header";
import Footer from "../components/Footer";
import Card from "../components/Card";
import Button from "../components/Button";
import Input from "../components/Input";
import { useApi } from "../contexts/ApiContext";
import { safeErrorString, validateGithubRepo } from "../utils/errors";

export default function SettingsScreen({ onTabChange }: { onTabChange: (tab: "dashboard" | "settings" | "welcome") => void }) {
  const { settings, saveSettings, resetAll } = useApi();
  const [repoUrl, setRepoUrl] = useState(settings?.githubRepo || "");
  const [subdir, setSubdir] = useState(settings?.subdirectoryName || "");
  const [loading, setLoading] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"" | "saved" | "error">("");
  const [urlError, setUrlError] = useState("");
  const [showComingSoon, setShowComingSoon] = useState(false);

  const handleSave = async () => {
    setSaveStatus("");
    const validationError = validateGithubRepo(repoUrl);
    if (validationError) {
      setUrlError(validationError);
      return;
    }
    setLoading(true);
    try {
      await saveSettings({ githubRepo: repoUrl, subdirectoryName: subdir, useSubdirectory: !!subdir });
      setSaveStatus("saved");
    } catch (err: unknown) {
      setSaveStatus("error");
      setUrlError(safeErrorString(err));
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async () => {
    if (window.confirm("Are you sure you want to reset all data and sign out?")) {
      await resetAll();
      onTabChange("welcome");
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#F4F4F5] relative">
      <Header activeTab="settings" onTabChange={onTabChange} ghRepoPath={settings?.githubUsername ? `${settings.githubUsername}/${settings.githubRepo}` : undefined} cfHandle={settings?.codeforcesHandle} />

      <div className="flex-1 overflow-y-auto scrollbar-none p-4">
        <Card title={
          <div className="flex items-center justify-between w-full">
            <span>Settings</span>
            <button onClick={() => onTabChange("dashboard")} className="text-gray-500 hover:text-gray-800 transition-colors" title="Close settings">
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </div>
        }>
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center shrink-0">
                <svg className="w-5 h-5 text-black" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
                </svg>
              </div>
              <div className="font-mono text-[13px] leading-snug">
                <p className="font-bold">GitHub</p>
                <p className="text-gray-600">Username: "{settings?.githubUsername || "Not connected"}"</p>
                <p className="text-gray-600">repo: "{settings?.githubRepo || "Not linked"}"</p>
              </div>
            </div>

            <hr className="border-gray-200" />

            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center shrink-0">
                <svg className="w-5 h-5 text-black" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4.5 10.5v6M9 7.5v9M13.5 4.5v12M18 9v7.5" />
                </svg>
              </div>
              <div className="font-mono text-[13px] leading-snug">
                <p className="font-bold">Codeforces</p>
                <p className="text-gray-600">Username: "{settings?.codeforcesHandle || "Not connected"}"</p>
              </div>
            </div>
          </div>

          <hr className="border-gray-200 my-4" />

          <div className="mb-4">
            <h3 className="font-mono font-bold text-base mb-3">General</h3>

            <div className="space-y-3">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <svg className="w-4 h-4 text-gray-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"/></svg>
                  <span className="font-mono text-[13px] text-gray-700">Change or unlink repo</span>
                </div>
                <Input value={repoUrl} onChange={(e) => { setRepoUrl(e.target.value); setUrlError(""); }} placeholder="Add new repo URL" error={urlError} />
              </div>

              <hr className="border-gray-200" />

              <div>
                <div className="flex items-center gap-2 mb-1">
                  <svg className="w-4 h-4 text-gray-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"/></svg>
                  <span className="font-mono text-[13px] text-gray-700">Set a subdirectory</span>
                </div>
                <Input value={subdir} onChange={(e) => setSubdir(e.target.value)} placeholder="// write subdirectory name" />
              </div>

              <hr className="border-gray-200" />

              <div>
                <button
                  onClick={() => setShowComingSoon(true)}
                  className="flex items-center justify-between w-full py-2.5 px-3 rounded-lg bg-gray-100 text-gray-400 font-mono text-sm cursor-pointer hover:bg-gray-200 transition-colors"
                >
                  <span>All Submissions Sync</span>
                  <span className="text-[10px] bg-yellow-200 text-yellow-800 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">Coming Soon</span>
                </button>
              </div>
            </div>
          </div>

          {saveStatus === "saved" && (
            <p className="text-[11px] text-green-600 font-mono text-center mb-4">Settings saved successfully.</p>
          )}

          <hr className="border-gray-200 mb-4" />

          <div>
            <h3 className="font-mono font-bold text-lg mb-3">Danger Area</h3>
            <div className="flex justify-between gap-3">
              <Button
                variant="danger"
                size="half"
                onClick={handleReset}
                leftIcon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>}
              >
                Reset All
              </Button>
              <Button
                variant="primary"
                size="half"
                onClick={handleSave}
                isLoading={loading}
                leftIcon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7"/></svg>}
              >
                save
              </Button>
            </div>
          </div>
        </Card>
      </div>

      <Footer />

      {showComingSoon && (
        <div className="absolute inset-0 bg-black/20 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-5 mx-6 shadow-lg max-w-[280px]">
            <p className="font-mono text-sm text-gray-800 text-center leading-relaxed">
              This feature will sync all historical accepted submissions from Codeforces.
            </p>
            <button
              onClick={() => setShowComingSoon(false)}
              className="mt-4 w-full py-2.5 bg-[#00C853] text-white rounded-lg font-bold font-mono text-sm hover:brightness-95 active:scale-95 transition-all"
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
