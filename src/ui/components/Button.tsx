import React from "react";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "danger" | "ghost" | "icon";
  size?: "full" | "half" | "auto";
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
}

export default function Button({
  variant = "primary",
  size = "auto",
  isLoading = false,
  leftIcon,
  className = "",
  children,
  disabled,
  ...props
}: ButtonProps) {
  const baseClasses = "flex items-center justify-center gap-2 rounded-lg font-bold transition-all duration-150 outline-none";
  
  const variants = {
    primary: "bg-[#00C853] text-white hover:brightness-95 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed",
    danger: "bg-[#EF4444] text-white hover:brightness-95 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed",
    ghost: "bg-transparent text-gray-700 hover:bg-gray-100 active:scale-95",
    icon: "bg-transparent text-black p-1.5 hover:bg-gray-200/50 rounded-full active:scale-95",
  };

  const sizes = {
    full: "w-full py-3 px-4",
    half: "w-[48%] py-3 px-4",
    auto: "w-auto py-2 px-4",
  };

  const sizeClass = variant === "icon" ? "" : sizes[size];

  return (
    <button
      className={`${baseClasses} ${variants[variant]} ${sizeClass} ${className}`}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading && (
        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-current" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      )}
      {!isLoading && leftIcon && <span className="flex-shrink-0">{leftIcon}</span>}
      {children}
    </button>
  );
}
