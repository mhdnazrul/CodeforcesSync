import React, { useState } from "react";
import Button from "../components/Button";
import Stepper from "../components/Stepper";
import Input from "../components/Input";
import Footer from "../components/Footer";
import { useApi } from "../contexts/ApiContext";
import { safeErrorString, validateCodeforcesHandle } from "../utils/errors";
import Logo from "../../assets/logo.png"

interface Props {
  onNext: () => void;
  onBack: () => void;
}

export default function CodeforcesAuthScreen({ onNext, onBack }: Props) {
  const { connectCodeforces } = useApi();
  const [handle, setHandle] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [detecting, setDetecting] = useState(false);

  const handleConnect = async () => {
    const validationError = validateCodeforcesHandle(handle);
    if (validationError) {
      setError(validationError);
      return;
    }
    setLoading(true);
    setError("");
    try {
      await connectCodeforces(handle);
      onNext();
    } catch (err: unknown) {
      setError(safeErrorString(err) || "User not found");
    } finally {
      setLoading(false);
    }
  };

  const handleDetect = async () => {
    setDetecting(true);
    setError("");
    try {
      const tabs = await chrome.tabs.query({ url: "*://codeforces.com/*" });
      if (!tabs.length) {
        throw new Error("Open codeforces.com in any tab first");
      }
      const tab = tabs.find((t) => t.active) || tabs[0];
      if (tab.id == null) throw new Error("No tab ID");

      const url = tab.url || "";
      const profileMatch = url.match(/codeforces\.com\/profile\/([^/?#]+)/);
      if (profileMatch) {
        setHandle(decodeURIComponent(profileMatch[1]));
        return;
      }

      const results = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: () => {
          const el = document.querySelector('a[href^="/profile/"]') as HTMLElement | null;
          if (el?.innerText?.trim()) return el.innerText.trim();
          const sidebar = document.querySelector('.personal-sidebar .handle') as HTMLElement | null;
          if (sidebar?.innerText?.trim()) return sidebar.innerText.trim();
          return null;
        },
      });

      const detected = results?.[0]?.result;
      if (detected) {
        setHandle(detected);
      } else {
        throw new Error("Could not detect handle from page");
      }
    } catch (err: unknown) {
      setError(safeErrorString(err));
    } finally {
      setDetecting(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#F4F4F5]">
      <div className="flex-1 flex flex-col items-center p-6">
        <div className="flex flex-col items-center w-full max-w-xs mt-6">
        <img src={Logo} className="w-24 h-24 rounded-full border-4 border-[#00C853] mb-8 bg-white object-cover" alt="CodeSync" />

        <Stepper step={2} total={3} />

        <div className="mt-6 text-center w-full">
          <h1 className="text-xl font-bold font-mono mb-2">Authorize Codeforces</h1>
          <p className="font-mono text-sm text-gray-700 leading-relaxed mb-6">
            To sync your submissions on Codeforces, we need access to your account first
          </p>

          <div className="mb-4 text-left">
            <Input
              placeholder="Enter your Codeforces Handle"
              value={handle}
              onChange={(e) => { setHandle(e.target.value); setError(""); }}
              error={error}
            />
          </div>

          <div className="flex justify-between gap-3 mb-2">
            <Button variant="primary" size="half" onClick={handleDetect} isLoading={detecting}>
              {detecting ? "Detecting..." : "Detect"}
            </Button>
            <Button variant="primary" size="half" onClick={handleConnect} isLoading={loading}>
              Connect
            </Button>
          </div>

          <p className="text-center font-mono text-[12px] text-gray-500 mt-2">
            You can revoke access at any time.
          </p>

          <div className="mt-6">
            <Button variant="ghost" size="auto" onClick={onBack}>
              ← Back
            </Button>
          </div>
        </div>
      </div>
      </div>

      <Footer />
    </div>
  );
}
