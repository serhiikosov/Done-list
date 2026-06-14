import { Mic, ListChecks, Target, Plus } from "lucide-react";
import type { View } from "./Sidebar";

interface Props {
  view: View;
  setView: (v: View) => void;
  onCapture: () => void;
}

export function BottomBar({ view, setView, onCapture }: Props) {
  return (
    <>
      {/* Floating capture button */}
      <button
        onClick={onCapture}
        aria-label="Add entry"
        className="ring-focus tap fixed bottom-24 right-5 z-40 grid h-14 w-14 place-items-center rounded-full text-[var(--accent-fg)] md:hidden"
        style={{
          background: "var(--accent)",
          boxShadow: "0 8px 20px color-mix(in srgb, var(--accent) 50%, transparent)",
        }}
      >
        <Plus size={28} strokeWidth={2.6} />
      </button>

      <nav
        className="pb-safe fixed inset-x-0 bottom-0 z-30 md:hidden"
        style={{
          background: "color-mix(in srgb, var(--bg) 88%, transparent)",
          backdropFilter: "blur(16px)",
          borderTop: "1px solid var(--border)",
        }}
      >
        <div className="mx-auto flex max-w-md items-center justify-around px-2 pt-2">
          <Tab active={view === "standup"} onClick={() => setView("standup")} icon={<Mic size={23} />} label="Standup" />
          <Tab active={view === "timeline"} onClick={() => setView("timeline")} icon={<ListChecks size={23} />} label="Timeline" />
          <Tab active={view === "goals"} onClick={() => setView("goals")} icon={<Target size={23} />} label="Goals" />
        </div>
      </nav>
    </>
  );
}

function Tab({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className="ring-focus tap flex flex-1 flex-col items-center gap-1 rounded-lg py-1.5 text-[11px] font-medium"
      style={{ color: active ? "var(--accent)" : "var(--text-faint)" }}
    >
      {icon}
      {label}
    </button>
  );
}
