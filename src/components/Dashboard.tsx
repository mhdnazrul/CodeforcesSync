import type { AppSettings } from "../utils/storage";
import { getWeeklyProgress } from "../statistics";
import { toLocalDateString } from "../shared/utils/date";
import HeaderIcons from "./HeaderIcons";

export default function Dashboard({
  settings,
  onSettingsClick,
  tokenExpired,
}: {
  settings: AppSettings;
  onSettingsClick: () => void;
  tokenExpired: boolean;
}) {
  const isAuthenticated = !!settings.githubToken && !!settings.githubUsername;
  const repoLinked = !!settings.githubRepo;
  const todayStr = toLocalDateString(new Date());
  const isFireActive = settings.lastAcceptedDate === todayStr;
  const weeklyProgress = getWeeklyProgress(settings.solvedDays);

  return (
    <div className="flex flex-col bg-white">
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
          onSettingsClick={onSettingsClick}
          codeforcesHandle={settings.codeforcesHandle}
        />
      </div>

      <div className="p-5 space-y-4">
        <div className="streak-card rounded-2xl p-5 relative overflow-hidden">
          <div className="absolute -right-6 -top-6 w-28 h-28 rounded-full bg-amber-200/30 blur-2xl pointer-events-none" />

          <div className="flex items-center gap-5 mb-5">
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

        <div className="bg-white border border-slate-100 rounded-2xl p-4 space-y-3 shadow-sm">
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

          {isAuthenticated && (
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-400 font-medium">Account</span>
              <span className="text-xs font-semibold text-slate-600">@{settings.githubUsername}</span>
            </div>
          )}

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
                onClick={onSettingsClick}
                className="text-xs font-semibold text-slate-400 hover:text-teal-600 transition-colors"
              >
                Configure →
              </button>
            )}
          </div>

          {tokenExpired && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-rose-50 border border-rose-100">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />
              <span className="text-[10px] text-rose-700 font-semibold">
                GitHub token expired — please update it in Settings.
              </span>
            </div>
          )}

          <div className="flex items-center gap-1.5 pt-1 border-t border-slate-50">
            <span className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-pulse" />
            <span className="text-[10px] text-slate-400 font-medium">Auto-sync active · checks every minute</span>
          </div>
        </div>

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
