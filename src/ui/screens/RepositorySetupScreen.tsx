import React, { useState } from "react";
import Button from "../components/Button";
import Stepper from "../components/Stepper";
import Input from "../components/Input";
import Footer from "../components/Footer";
import { useApi } from "../contexts/ApiContext";
import { safeErrorString, validateGithubRepo } from "../utils/errors";
import Logo from "../../assets/logo.png"

interface Props {
  onNext: () => void;
  onBack: () => void;
}

export default function RepositorySetupScreen({ onNext, onBack }: Props) {
  const { linkRepository } = useApi();
  const [url, setUrl] = useState("");
  const [subdir, setSubdir] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [urlError, setUrlError] = useState("");

  const handleFinish = async () => {
    const validationError = validateGithubRepo(url);
    if (validationError) {
      setUrlError(validationError);
      return;
    }
    setLoading(true);
    setError("");
    try {
      await linkRepository(url, subdir);
      onNext();
    } catch (err: unknown) {
      setError(safeErrorString(err) || "Failed to link repository");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#F4F4F5] overflow-hidden">
      <div className="flex-1 flex flex-col items-center justify-center p-3 box-border">
        <div className="flex flex-col items-center w-full max-w-xs min-h-0">
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
              onChange={(e) => { setUrl(e.target.value); setUrlError(""); }}
              error={urlError || error}
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

          <div className="mt-3">
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
