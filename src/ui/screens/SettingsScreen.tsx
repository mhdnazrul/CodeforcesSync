import React, { useState } from "react";
import Header from "../components/Header";
import Footer from "../components/Footer";
import Card from "../components/Card";
import Button from "../components/Button";
import Input from "../components/Input";
import { useApi } from "../contexts/ApiContext";

export default function SettingsScreen({ onTabChange }: { onTabChange: (tab: "dashboard" | "settings") => void }) {
  const { settings, saveSettings, resetAll } = useApi();
  const [repoUrl, setRepoUrl] = useState(settings?.githubRepo || "");
  const [subdir, setSubdir] = useState(settings?.subdirectoryName || "");
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    setLoading(true);
    await saveSettings({ githubRepo: repoUrl, subdirectoryName: subdir, useSubdirectory: !!subdir });
    setLoading(false);
  };

  const handleReset = async () => {
    if (window.confirm("Are you sure you want to reset all data and sign out?")) {
      await resetAll();
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#F4F4F5]">
      <Header activeTab="settings" onTabChange={onTabChange} githubUrl={settings?.githubRepo ? `https://github.com/${settings.githubUsername}/${settings.githubRepo}` : undefined} />
      
      <div className="flex-1 overflow-y-auto scrollbar-none p-4">
        <Card title="Settings" className="h-full flex flex-col">
          <div className="space-y-4 mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full border-2 border-black flex items-center justify-center">
                <svg className="w-6 h-6 text-black" fill="currentColor" viewBox="0 0 24 24"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>
              </div>
              <div className="font-mono text-sm">
                <p className="font-bold">Github</p>
                <p>Username: "{settings?.githubUsername || "Not connected"}"</p>
                <p>repo: "{settings?.githubRepo || "Not linked"}"</p>
              </div>
            </div>
            
            <div className="h-0.5 bg-black w-full" />
            
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full border-2 border-black flex items-center justify-center">
                <svg className="w-6 h-6 text-black" fill="currentColor" viewBox="0 0 24 24"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>
              </div>
              <div className="font-mono text-sm">
                <p className="font-bold">Codeforces</p>
                <p>Username: "{settings?.codeforcesHandle || "Not connected"}"</p>
              </div>
            </div>
          </div>

          <div className="border border-black rounded-lg p-3 mb-4 flex-1">
            <h3 className="font-mono font-bold text-lg mb-3">General</h3>
            
            <div className="space-y-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <svg className="w-4 h-4 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"/></svg>
                  <span className="font-mono text-sm">Change or unlink repo</span>
                </div>
                <Input value={repoUrl} onChange={(e) => setRepoUrl(e.target.value)} placeholder="Add new repo URL" />
              </div>
              
              <div className="h-px bg-gray-300" />
              
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <svg className="w-4 h-4 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"/></svg>
                  <span className="font-mono text-sm">Set a subdirectory</span>
                </div>
                <Input value={subdir} onChange={(e) => setSubdir(e.target.value)} placeholder="// write subdirectory name" />
              </div>
            </div>
          </div>

          <div className="mt-auto">
            <h3 className="font-mono font-bold text-lg mb-2">Danger Area</h3>
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
    </div>
  );
}
