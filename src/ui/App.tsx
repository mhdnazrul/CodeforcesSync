import React, { useState } from "react";
import ErrorBoundary from "./components/ErrorBoundary";
import WelcomeScreen from "./screens/WelcomeScreen";
import GithubAuthScreen from "./screens/GithubAuthScreen";
import CodeforcesAuthScreen from "./screens/CodeforcesAuthScreen";
import RepositorySetupScreen from "./screens/RepositorySetupScreen";
import DashboardScreen from "./screens/DashboardScreen";
import SettingsScreen from "./screens/SettingsScreen";
import { useApi } from "./contexts/ApiContext";
import type { AppSettings } from "../storage";

type ScreenState =
  | "welcome"
  | "github"
  | "codeforces"
  | "repository"
  | "dashboard"
  | "settings";

const WIZARD_ORDER: ScreenState[] = ["welcome", "github", "codeforces", "repository"];

function deriveScreen(settings: AppSettings | null, isLoading: boolean, manual: ScreenState | null): ScreenState {
  if (manual) return manual;
  if (isLoading || !settings) return "welcome";
  if (settings.githubToken && settings.githubRepo && settings.codeforcesHandle) return "dashboard";
  if (!settings.githubToken && !settings.codeforcesHandle && !settings.githubRepo) return "welcome";
  if (!settings.githubToken) return "github";
  if (!settings.codeforcesHandle) return "codeforces";
  return "repository";
}

export default function AppUI() {
  const { settings, isLoading } = useApi();
  const [manualScreen, setManualScreen] = useState<ScreenState | null>(null);

  const currentScreen = deriveScreen(settings, isLoading, manualScreen);

  const navigateTo = (screen: ScreenState) => {
    setManualScreen(screen);
  };

  const handleBack = () => {
    const idx = WIZARD_ORDER.indexOf(currentScreen);
    if (idx > 0) navigateTo(WIZARD_ORDER[idx - 1]);
  };

  const handleTabChange = (tab: ScreenState) => {
    setManualScreen(tab == null ? null : tab);
  };

  if (isLoading) {
    return (
      <div className="w-[350px] h-[500px] flex items-center justify-center bg-[#F4F4F5]">
        <div className="flex flex-col items-center">
          <svg className="animate-spin h-8 w-8 text-[#00C853] mb-4" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <span className="font-mono text-sm text-gray-500">Loading...</span>
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <div className="w-[350px] h-[500px] overflow-hidden relative">
        <div className="absolute inset-0 transition-opacity duration-200">
          {currentScreen === "welcome" && <WelcomeScreen onNext={() => navigateTo("github")} />}
          {currentScreen === "github" && <GithubAuthScreen onNext={() => navigateTo("codeforces")} onBack={handleBack} />}
          {currentScreen === "codeforces" && <CodeforcesAuthScreen onNext={() => navigateTo("repository")} onBack={handleBack} />}
          {currentScreen === "repository" && <RepositorySetupScreen onNext={() => navigateTo("dashboard")} onBack={handleBack} />}

          {currentScreen === "dashboard" && <DashboardScreen onTabChange={handleTabChange} />}
          {currentScreen === "settings" && <SettingsScreen onTabChange={handleTabChange} />}
        </div>
      </div>
    </ErrorBoundary>
  );
}
