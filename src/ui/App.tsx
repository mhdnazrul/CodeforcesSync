import React, { useState } from "react";
import WelcomeScreen from "./screens/WelcomeScreen";
import GithubAuthScreen from "./screens/GithubAuthScreen";
import CodeforcesAuthScreen from "./screens/CodeforcesAuthScreen";
import RepositorySetupScreen from "./screens/RepositorySetupScreen";
import DashboardScreen from "./screens/DashboardScreen";
import SettingsScreen from "./screens/SettingsScreen";
import { useApi } from "./contexts/ApiContext";

type ScreenState = 
  | "welcome"
  | "github"
  | "codeforces"
  | "repository"
  | "dashboard"
  | "settings";

export default function AppUI() {
  const { isOnboarded, isLoading, onboardingStep, setOnboardingStep } = useApi();
  const [manualScreen, setManualScreen] = useState<ScreenState | null>(null);

  // Derive the active screen from onboarding state.
  // Manual navigation (settings, dashboard toggle) overrides the derived screen.
  const currentScreen: ScreenState = (() => {
    if (manualScreen) return manualScreen;
    if (isLoading) return "welcome";
    if (isOnboarded) return "dashboard";
    return (onboardingStep as ScreenState) || "welcome";
  })();

  const handleNext = (nextStep: ScreenState) => {
    setOnboardingStep(nextStep);
    setManualScreen(nextStep);
  };

  const handleTabChange = (tab: ScreenState) => {
    setManualScreen(tab);
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
    <div className="w-[350px] h-[500px] overflow-hidden relative">
      <div className="absolute inset-0 transition-opacity duration-200">
        {currentScreen === "welcome" && <WelcomeScreen onNext={() => handleNext("github")} />}
        {currentScreen === "github" && <GithubAuthScreen onNext={() => handleNext("codeforces")} />}
        {currentScreen === "codeforces" && <CodeforcesAuthScreen onNext={() => handleNext("repository")} />}
        {currentScreen === "repository" && <RepositorySetupScreen onNext={() => handleNext("dashboard")} />}
        
        {currentScreen === "dashboard" && <DashboardScreen onTabChange={handleTabChange} />}
        {currentScreen === "settings" && <SettingsScreen onTabChange={handleTabChange} />}
      </div>
    </div>
  );
}
