import React, { useState } from "react";
import Button from "../components/Button";
import Stepper from "../components/Stepper";
import Input from "../components/Input";
import Footer from "../components/Footer";
import { useApi } from "../contexts/ApiContext";
import Logo from "../../assets/logo.png"

export default function RepositorySetupScreen({ onNext }: { onNext: () => void }) {
  const { linkRepository } = useApi();
  const [url, setUrl] = useState("");
  const [subdir, setSubdir] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleFinish = async () => {
    if (!url.trim()) {
      setError("Repository URL is required");
      return;
    }
    setLoading(true);
    setError("");
    try {
      await linkRepository(url, subdir);
      onNext();
    } catch (err: any) {
      setError(err.message || "Failed to link repository");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col justify-between h-full p-3 box-border bg-[#F4F4F5] overflow-hidden">
      <div className="flex-1 flex flex-col items-center justify-center w-full max-w-xs mx-auto min-h-0">
        <img src={Logo} className="w-16 h-16 rounded-full border-2 border-[#00C853] mb-4 bg-white object-cover shrink-0" alt="CodeSync" />

        <Stepper step={3} total={3} />

        <div className="mt-4 text-center w-full flex-1 min-h-0 flex flex-col justify-center">
          <h1 className="text-lg font-bold font-mono mb-1">Link a Repository</h1>
          <p className="font-mono text-[12px] text-gray-700 leading-tight mb-3">
            One last step. We need to know which repository you want to push your code to
          </p>

          <div className="space-y-2 mb-3 text-left w-full">
            <Input
              label="Repository URL"
              placeholder="Paste the repository URL to push your submissions to."
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              error={error}
            />
            <Input
              label="Subdirectory (Optional)"
              placeholder="Subdirectory name (e.g. /solutions)"
              value={subdir}
              onChange={(e) => setSubdir(e.target.value)}
            />
          </div>

          <p className="text-center font-mono text-[11px] text-gray-500 mb-3">
            You can change this later.
          </p>

          <Button variant="primary" size="full" onClick={handleFinish} isLoading={loading}>
            Finish Setup
          </Button>
        </div>
      </div>

      <Footer />
    </div>
  );
}
