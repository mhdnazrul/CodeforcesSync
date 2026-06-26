import { useSettings } from "./hooks/useSettings";
import Dashboard from "./components/Dashboard";
import SettingsView from "./components/SettingsView";
import "./index.css";

export default function App() {
  const { settings, showSettings, setShowSettings, saveStatus, tokenExpired, repoError, handleChange, handleSave } = useSettings();

  if (showSettings) {
    return (
      <SettingsView
        settings={settings}
        saveStatus={saveStatus}
        repoError={repoError}
        onClose={() => setShowSettings(false)}
        onChange={handleChange}
        onSave={handleSave}
      />
    );
  }

  return (
    <Dashboard
      settings={settings}
      onSettingsClick={() => setShowSettings(true)}
      tokenExpired={tokenExpired}
    />
  );
}
