import React from "react";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export default function Input({ label, error, className = "", ...props }: InputProps) {
  return (
    <div className={`flex flex-col gap-1.5 w-full ${className}`}>
      {label && (
        <label className="text-sm font-semibold text-gray-700">
          {label}
        </label>
      )}
      <input
        className={`w-full px-3 py-2.5 rounded-lg border bg-gray-50 outline-none transition-all duration-150 text-sm font-mono
          ${error 
            ? "border-red-500 focus:ring-2 focus:ring-red-200" 
            : "border-gray-300 focus:border-[#00C853] focus:ring-2 focus:ring-[#00C853]/20"
          }
          placeholder:text-blue-500/70
        `}
        {...props}
      />
      {error && <span className="text-[11px] text-red-500 font-medium">{error}</span>}
    </div>
  );
}
