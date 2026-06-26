import React, { useState } from "react";
import Button from "../components/Button";
import Stepper from "../components/Stepper";
import Footer from "../components/Footer";
import { useApi } from "../contexts/ApiContext";
import Logo from "../../assets/logo.png"

export default function GithubAuthScreen({ onNext }: { onNext: () => void }) {
  const { connectGitHub } = useApi();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async () => {
    setLoading(true);
    setError("");
    try {
      await connectGitHub();
      onNext();
    } catch (err: any) {
      setError(err.message || "OAuth failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full items-center p-6 bg-[#F4F4F5]">
      <div className="flex-1 flex flex-col items-center mt-6 w-full max-w-xs">
        <img src={Logo} className="w-24 h-24 rounded-full border-4 border-[#00C853] mb-8 bg-white object-cover" alt="CodeSync" />

        <Stepper step={1} total={3} />

        <div className="mt-6 text-center w-full">
          <h1 className="text-xl font-bold font-mono mb-2">Authorize with GitHub</h1>
          <p className="font-mono text-sm text-gray-700 leading-relaxed mb-6">
            Before we can push code to your selected repository, we need access to your GitHub account.
          </p>

          <Button
            variant="primary"
            size="full"
            onClick={handleLogin}
            isLoading={loading}
            leftIcon={
              !loading && (
                <svg className="w-5 h-5 mr-1" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
                </svg>
              )
            }
          >
            {loading ? "Authorizing..." : "Login with GitHub"}
          </Button>

          {error && <p className="text-red-500 font-mono text-[11px] mt-2">{error}</p>}

          <p className="text-center font-mono text-[12px] text-gray-500 mt-2">
            You can revoke access at any time.
          </p>
        </div>
      </div>

      <Footer />
    </div>
  );
}
