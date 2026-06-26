import { useSettings } from "./hooks/useSettings";
import Dashboard from "./components/Dashboard";
import SettingsView from "./components/SettingsView";
import "./index.css";

export default function App() {
  const { settings, showSettings, setShowSettings, saveStatus, tokenExpired, handleChange, handleSave } = useSettings();

  if (showSettings) {
    return (
      <SettingsView
        settings={settings}
        saveStatus={saveStatus}
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
