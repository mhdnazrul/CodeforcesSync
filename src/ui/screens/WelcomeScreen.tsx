import React from "react";
import Button from "../components/Button";
import Footer from "../components/Footer";
import Logo from "../../assets/logo.png"
export default function WelcomeScreen({ onNext }: { onNext: () => void }) {
  return (
    <div className="flex flex-col h-full items-center p-6 bg-[#F4F4F5]">
      <div className="flex-1 flex flex-col items-center justify-center w-full max-w-xs">
        <img src={Logo} className="w-32 h-32 rounded-full border-4 border-[#00C853] mb-6 bg-white object-cover" alt="CodeSync" />

        <div className="relative mb-6">
          <h1 className="text-4xl font-bold text-center" style={{ fontFamily: "cursive" }}>Welcome</h1>
          <div className="absolute top-2 -left-6 space-y-1">
            <div className="w-4 h-0.5 bg-black -rotate-12" />
            <div className="w-5 h-0.5 bg-black" />
            <div className="w-4 h-0.5 bg-black rotate-12" />
          </div>
          <div className="absolute top-2 -right-6 space-y-1">
            <div className="w-4 h-0.5 bg-black rotate-12" />
            <div className="w-5 h-0.5 bg-black" />
            <div className="w-4 h-0.5 bg-black -rotate-12" />
          </div>
        </div>

        <p className="text-center font-mono text-sm text-gray-800 mb-8 px-2 leading-relaxed">
          Automatically sync your accepted Codeforces solutions to GitHub.
        </p>

        <div className="w-full space-y-2">
          <Button variant="primary" size="full" onClick={onNext}>
            complete setup
          </Button>
          <p className="text-center font-mono text-[11px] text-gray-400 font-bold uppercase tracking-wider">
            This Will take less than 2 minutes
          </p>
        </div>
      </div>

      <Footer />
    </div>
  );
}
