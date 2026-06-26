import React from "react";

interface CardProps {
  children: React.ReactNode;
  title?: React.ReactNode;
  className?: string;
}

export default function Card({ children, title, className = "" }: CardProps) {
  return (
    <div className={`bg-white border-2 border-[#FDE047] rounded-xl p-4 shadow-sm ${className}`}>
      {title && (
        <h2 className="text-lg font-bold text-black mb-3">{title}</h2>
      )}
      {children}
    </div>
  );
}
