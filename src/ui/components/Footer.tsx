import React from "react";

export default function Footer() {
  return (
    <div className="w-full text-center py-4 bg-gray-50/50 mt-auto">
      <p className="text-[11px] text-gray-500 font-mono">
        Having Issues?{" "}
        <a 
          href="https://github.com/mhdnazrul/CodeforcesSync/issues" 
          target="_blank" 
          rel="noreferrer"
          className="text-blue-600 hover:underline"
        >
          Report Bug
        </a>
        {" | "}
        Made with <span className="text-red-500">❤️</span> by{" "}
        <a 
          href="https://github.com/mhdnazrul" 
          target="_blank" 
          rel="noreferrer"
          className="text-blue-600 hover:underline"
        >
          @mhdnazrul
        </a>
      </p>
    </div>
  );
}
