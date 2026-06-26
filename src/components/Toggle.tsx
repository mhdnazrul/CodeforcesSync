export default function Toggle({ on, onChange }: { on: boolean; onChange: () => void }) {
  return (
    <button
      role="switch"
      aria-checked={on}
      onClick={onChange}
      className={`w-10 h-5 rounded-full transition-colors relative focus:outline-none focus:ring-2 focus:ring-teal-400 focus:ring-offset-1 ${
        on ? "bg-teal-500" : "bg-slate-300"
      }`}
    >
      <div
        className={`absolute top-1 w-3 h-3 bg-white rounded-full shadow transition-all duration-200 ${
          on ? "left-6" : "left-1"
        }`}
      />
    </button>
  );
}
