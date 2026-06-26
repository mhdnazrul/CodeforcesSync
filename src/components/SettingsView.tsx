import type { AppSettings } from "../storage";
import Toggle from "./Toggle";

export default function SettingsView({
  settings,
  saveStatus,
  onClose,
  onChange,
  onSave,
}: {
  settings: AppSettings;
  saveStatus: "idle" | "saving" | "saved";
  onClose: () => void;
  onChange: (key: keyof AppSettings, value: AppSettings[keyof AppSettings]) => void;
  onSave: () => void;
}) {
  return (
    <div className="flex flex-col h-full bg-white">
      <div className="bg-gradient-to-r from-teal-600 to-teal-500 px-5 py-4 flex items-center justify-between shadow-md">
        <h1 className="text-white font-bold text-lg tracking-tight">Settings</h1>
        <button
          onClick={onClose}
          className="text-white/80 hover:text-white hover:bg-white/10 p-1.5 rounded-lg transition-all"
          title="Close"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className="p-5 flex-1 overflow-y-auto space-y-5">
        <section>
          <h2 className="settings-section-label">GitHub Authentication</h2>
          <div className="space-y-3 mt-3">
            <div>
              <label className="settings-label">Username</label>
              <input
                type="text"
                value={settings.githubUsername}
                onChange={(e) => onChange("githubUsername", e.target.value)}
                placeholder="@yourusername"
                className="settings-input"
              />
            </div>
            <div>
              <label className="settings-label">Access Token</label>
              <input
                type="password"
                value={settings.githubToken}
                onChange={(e) => onChange("githubToken", e.target.value)}
                placeholder="ghp_************************"
                className="settings-input"
              />
            </div>
          </div>
        </section>

        <div className="section-divider" />

        <section>
          <h2 className="settings-section-label">Codeforces</h2>
          <div className="mt-3">
            <label className="settings-label">Handle</label>
            <input
              type="text"
              value={settings.codeforcesHandle}
              onChange={(e) => onChange("codeforcesHandle", e.target.value)}
              placeholder="e.g. tourist"
              className="settings-input"
            />
          </div>
        </section>

        <div className="section-divider" />

        <section>
          <h2 className="settings-section-label">Target Repository</h2>
          <div className="space-y-3 mt-3">
            <div>
              <label className="settings-label">Repository Name</label>
              <input
                type="text"
                value={settings.githubRepo}
                onChange={(e) => onChange("githubRepo", e.target.value)}
                placeholder="e.g. Codeforces-Solutions"
                className="settings-input"
              />
            </div>

            <div className="flex items-center justify-between px-3 py-2.5 bg-slate-50 rounded-xl border border-slate-100">
              <span className="text-sm font-medium text-slate-600">Use Subdirectory</span>
              <Toggle
                on={settings.useSubdirectory}
                onChange={() => onChange("useSubdirectory", !settings.useSubdirectory)}
              />
            </div>

            {settings.useSubdirectory && (
              <div className="animate-in slide-in-from-top-1 duration-150">
                <label className="settings-label">Path Name</label>
                <input
                  type="text"
                  value={settings.subdirectoryName}
                  onChange={(e) => onChange("subdirectoryName", e.target.value)}
                  placeholder="solutions"
                  className="settings-input"
                />
              </div>
            )}
          </div>
        </section>
      </div>

      <div className="px-5 py-4 border-t border-slate-100 bg-slate-50/70 flex items-center justify-between gap-3">
        <span className={`text-xs font-semibold transition-opacity ${saveStatus === "saved" ? "text-teal-600 opacity-100" : "opacity-0"}`}>
          ✓ Saved successfully!
        </span>
        <button
          onClick={onSave}
          disabled={saveStatus === "saving"}
          className="btn-primary ml-auto"
        >
          {saveStatus === "saving" ? "Saving…" : "Apply Changes"}
        </button>
      </div>
    </div>
  );
}
