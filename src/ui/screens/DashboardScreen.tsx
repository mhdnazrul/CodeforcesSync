import React from "react";
import Header from "../components/Header";
import Footer from "../components/Footer";
import Card from "../components/Card";
import { useApi } from "../contexts/ApiContext";

export default function DashboardScreen({ onTabChange }: { onTabChange: (tab: "dashboard" | "settings") => void }) {
  const { stats, settings } = useApi();

  if (!stats) return null;

  const bestStreakDisplay = stats.bestStreak > 0 ? `${stats.bestStreak} Days` : "--";
  const totalAcDisplay = stats.totalAC > 0 ? stats.totalAC : "--";

  return (
    <div className="flex flex-col h-full bg-[#F4F4F5]">
      <Header activeTab="dashboard" onTabChange={onTabChange} githubUrl={`https://github.com/${settings?.githubUsername}/${settings?.githubRepo}`} codeforcesHandle={settings?.codeforcesHandle} />
      
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

        <Card title="Statistics Section" className="flex-1 min-h-0 flex flex-col justify-center">
          <div className="flex items-center mt-1">
            <div className="w-24 h-24 rounded-full border-[16px] border-blue-500 relative flex-shrink-0" 
              style={{
                borderTopColor: "#EF4444", 
                borderRightColor: "#F97316",
                transform: "rotate(-45deg)"
              }}
            >
              <div className="absolute inset-0 bg-white rounded-full" style={{ transform: "scale(0.8)" }}></div>
            </div>

            <div className="w-px bg-gray-400 h-20 mx-4"></div>

            <div className="flex-1 font-mono text-[12px] leading-tight">
              <div className="mb-2">
                <p className="underline font-bold mb-0.5">Solved</p>
                <p>Total AC: <span className="float-right">{totalAcDisplay}</span></p>
              </div>
              
              <div>
                <p className="underline font-bold mb-0.5">Submissions</p>
                <p>TLE : <span className="float-right">{stats.submissions.tle}</span></p>
                <p>WA: <span className="float-right">{stats.submissions.wa}</span></p>
                <p>RTE: <span className="float-right">{stats.submissions.rte}</span></p>
                <p>MLE: <span className="float-right">{stats.submissions.mle}</span></p>
              </div>
            </div>
          </div>
        </Card>
      </div>

      <Footer />
    </div>
  );
}
