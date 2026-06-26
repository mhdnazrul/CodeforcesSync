import React, { useState } from "react";
import Button from "../components/Button";
import Stepper from "../components/Stepper";
import Input from "../components/Input";
import Footer from "../components/Footer";
import { useApi } from "../contexts/ApiContext";
import Logo from "../../assets/logo.png"

export default function CodeforcesAuthScreen({ onNext }: { onNext: () => void }) {
  const { connectCodeforces } = useApi();
  const [handle, setHandle] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleConnect = async () => {
    if (!handle.trim()) {
      setError("Handle cannot be empty");
      return;
    }
    setLoading(true);
    setError("");
    try {
      await connectCodeforces(handle);
      onNext();
    } catch (err: any) {
      setError(err.message || "User not found");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full items-center p-6 bg-[#F4F4F5]">
      <div className="flex-1 flex flex-col items-center mt-6 w-full max-w-xs">
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
              onChange={(e) => setHandle(e.target.value)}
              error={error}
            />
          </div>

          <div className="flex justify-between gap-3 mb-2">
            <Button variant="primary" size="half" onClick={() => setHandle("tourist")}>
              Auto Detect
            </Button>
            <Button variant="primary" size="half" onClick={handleConnect} isLoading={loading}>
              Connect
            </Button>
          </div>

          <p className="text-center font-mono text-[12px] text-gray-500 mt-2">
            You can revoke access at any time.
          </p>
        </div>
      </div>

      <Footer />
    </div>
  );
}
