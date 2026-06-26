import React, { useState, useRef, useCallback } from "react";
import Button from "../components/Button";
import Stepper from "../components/Stepper";
import Input from "../components/Input";
import Footer from "../components/Footer";
import { useApi } from "../contexts/ApiContext";
import { safeErrorString, validateGithubRepo } from "../utils/errors";
import Logo from "../../assets/logo.png"

function parseOwnerRepo(input: string): { owner: string; repo: string } | null {
  const trimmed = input.trim();
  const urlMatch = trimmed.match(/^(?:https?:\/\/)?(?:www\.)?github\.com\/([^/]+)\/([^/#.?]+)/);
  if (urlMatch) return { owner: urlMatch[1], repo: urlMatch[2] };
  const repoMatch = trimmed.match(/^([a-zA-Z0-9_.-]+)\/([a-zA-Z0-9_.-]+)$/);
  if (repoMatch) return { owner: repoMatch[1], repo: repoMatch[2] };
  return null;
}

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
  const [validating, setValidating] = useState(false);
  const [validated, setValidated] = useState<"valid" | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const handleUrlChange = useCallback((value: string) => {
    setUrl(value);
    setUrlError("");
    setValidated(null);
    setValidating(false);
    if (debounceRef.current) clearTimeout(debounceRef.current);

    const trimmed = value.trim();
    if (!trimmed) return;

    const formatError = validateGithubRepo(trimmed);
    if (formatError) {
      setUrlError(formatError);
      return;
    }

    const parsed = parseOwnerRepo(trimmed);
    if (!parsed) {
      setUrlError("Enter a valid GitHub URL or owner/repo name");
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setValidating(true);
      try {
        const response = await chrome.runtime.sendMessage({
          type: "VALIDATE_REPO",
          repo: `${parsed.owner}/${parsed.repo}`,
        });
        if (response?.valid) {
          setValidated("valid");
        } else {
          setUrlError(response?.error || "Repository validation failed");
        }
      } catch {
        setUrlError("Failed to validate repository");
      } finally {
        setValidating(false);
      }
    }, 500);
  }, []);

  const handleFinish = async () => {
    if (validated !== "valid") return;
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

  const canProceed = validated === "valid" && !loading;

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
              onChange={(e) => handleUrlChange(e.target.value)}
              error={urlError}
            />
            {validating && (
              <div className="flex items-center gap-1.5 text-[11px] text-gray-500">
                <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Checking repository...
              </div>
            )}
            <Input
              label="Subdirectory (Optional)"
              placeholder="Subdirectory name (e.g. /solutions)"
              value={subdir}
              onChange={(e) => setSubdir(e.target.value)}
            />
          </div>

          {error && <p className="text-[11px] text-red-500 mb-3">{error}</p>}

          <p className="text-center font-mono text-[11px] text-gray-500 mb-3">
            You can change this later.
          </p>

          <Button variant="primary" size="full" onClick={handleFinish} isLoading={loading} disabled={!canProceed}>
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
