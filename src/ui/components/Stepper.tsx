import React from "react";

export default function Stepper({ step, total }: { step: number; total: number }) {
  return (
    <div className="bg-gray-200 rounded-full px-4 py-1.5 inline-block">
      <span className="text-[13px] font-bold text-black">
        step {step}/{total}
      </span>
    </div>
  );
}
