import React, { useEffect } from "react";
import Header from "../components/Header";
import Footer from "../components/Footer";
import Card from "../components/Card";
import { useApi } from "../contexts/ApiContext";

export default function DashboardScreen({ onTabChange }: { onTabChange: (tab: "dashboard" | "settings") => void }) {
  const { stats, settings, cfStats, cfStatsLoading, cfStatsError, refreshCfStats } = useApi();

  useEffect(() => {
    if (settings?.codeforcesHandle && !cfStats && !cfStatsLoading && !cfStatsError) {
      refreshCfStats();
    }
  }, [settings?.codeforcesHandle, cfStats, cfStatsLoading, cfStatsError, refreshCfStats]);

  if (!stats) return null;

  const bestStreakDisplay = stats.bestStreak > 0 ? `${stats.bestStreak} Days` : "--";

  return (
    <div className="flex flex-col h-full bg-[#F4F4F5]">
      <Header activeTab="dashboard" onTabChange={onTabChange} ghRepoPath={settings?.githubRepo?.includes("/") ? settings.githubRepo : (settings?.githubUsername && settings?.githubRepo ? `${settings.githubUsername}/${settings.githubRepo}` : undefined)} cfHandle={settings?.codeforcesHandle} />
      
      <div className="flex-1 flex flex-col justify-between overflow-hidden p-3 min-h-0">
        <Card className="flex-1 min-h-0 flex flex-col justify-center mb-3">
          <div className="flex justify-between items-center mb-3 px-2">
            <div className="text-center">
              <p className="font-mono text-[11px] text-gray-700">Current Streak</p>
              <p className="font-mono text-2xl font-bold mt-0.5">{stats.currentStreak} Days</p>
            </div>
            <div className="text-center">
              <p className="font-mono text-[11px] text-gray-700">Best Streak</p>
              <p className="font-mono text-2xl font-bold mt-0.5">{bestStreakDisplay}</p>
            </div>
          </div>

          <div className="flex justify-between items-center px-1">
            {stats.weeklyProgress.map((day, i) => (
              <div key={i} className="flex flex-col items-center gap-1">
                <span className="font-mono text-xl font-bold">{day.day}</span>
                <div className={`w-7 h-7 rounded-full flex items-center justify-center
                  ${day.isFuture 
                    ? "border border-dashed border-gray-400" 
                    : day.solved 
                      ? "bg-[#00C853] text-white" 
                      : "bg-[#EF4444] text-white"
                  }
                `}>
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
        </Card>

        <Card title="Statistics Section" className="flex-1 min-h-0 flex flex-col overflow-y-auto">
          {cfStatsLoading && !cfStats ? (
            <div className="flex items-center justify-center py-4">
              <svg className="animate-spin h-5 w-5 text-[#00C853] mr-2" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              <span className="font-mono text-[11px] text-gray-500">Loading statistics...</span>
            </div>
          ) : cfStatsError && !cfStats ? (
            <div className="text-center py-4">
              <p className="font-mono text-[11px] text-red-500 mb-2">{cfStatsError}</p>
              <button onClick={refreshCfStats} className="font-mono text-[11px] text-blue-600 hover:underline">
                Retry
              </button>
            </div>
          ) : cfStats ? (
            <div className="font-mono text-[11px] leading-relaxed space-y-2">
              <div className="flex items-center justify-between bg-gray-50 rounded px-2 py-1.5">
                <span className="text-gray-600">Rating</span>
                <span className="font-bold">{cfStats.currentRating ?? "N/A"}{cfStats.maxRating != null ? ` (max: ${cfStats.maxRating})` : ""}</span>
              </div>
              <div className="flex items-center justify-between bg-gray-50 rounded px-2 py-1.5">
                <span className="text-gray-600">Rank</span>
                <span className="font-bold">{cfStats.currentRank ?? "N/A"}{cfStats.maxRank ? ` (max: ${cfStats.maxRank})` : ""}</span>
              </div>
              <hr className="border-gray-200" />
              <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[11px]">
                <div className="flex justify-between"><span className="text-gray-600">Total</span><span className="font-bold">{cfStats.totalSubmissions}</span></div>
                <div className="flex justify-between"><span className="text-gray-600">AC</span><span className="font-bold text-green-700">{cfStats.accepted}</span></div>
                <div className="flex justify-between"><span className="text-gray-600">WA</span><span className="font-bold text-red-600">{cfStats.wrongAnswer}</span></div>
                <div className="flex justify-between"><span className="text-gray-600">TLE</span><span className="font-bold text-orange-600">{cfStats.timeLimitExceeded}</span></div>
                <div className="flex justify-between"><span className="text-gray-600">RTE</span><span className="font-bold text-red-700">{cfStats.runtimeError}</span></div>
                <div className="flex justify-between"><span className="text-gray-600">CE</span><span className="font-bold text-yellow-700">{cfStats.compilationError}</span></div>
                <div className="flex justify-between"><span className="text-gray-600">MLE</span><span className="font-bold text-purple-700">{cfStats.memoryLimitExceeded}</span></div>
                <div className="flex justify-between"><span className="text-gray-600">OLE</span><span className="font-bold text-gray-700">{cfStats.outputLimitExceeded}</span></div>
                <div className="flex justify-between"><span className="text-gray-600">PE</span><span className="font-bold text-blue-700">{cfStats.presentationError}</span></div>
                <div className="flex justify-between col-span-2"><span className="text-gray-600">Acceptance Rate</span><span className="font-bold">{cfStats.acceptanceRate}%</span></div>
              </div>
              <hr className="border-gray-200" />
              <div className="flex justify-between bg-gray-50 rounded px-2 py-1.5">
                <span className="text-gray-600">Unique Solved</span>
                <span className="font-bold">{cfStats.uniqueSolvedProblems}</span>
              </div>
            </div>
          ) : (
            <div className="text-center py-4">
              <p className="font-mono text-[11px] text-gray-500">No statistics available</p>
              <button onClick={refreshCfStats} className="font-mono text-[11px] text-blue-600 hover:underline mt-1">
                Load
              </button>
            </div>
          )}
        </Card>
      </div>

      <Footer />
    </div>
  );
}
