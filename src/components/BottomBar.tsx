import { Mic, ListChecks, Plus } from "lucide-react";
import type { View } from "./Sidebar";

interface Props {
  view: View;
  setView: (v: View) => void;
  onCapture: () => void;
}

export function BottomBar({ view, setView, onCapture }: Props) {
  return (
    <nav
      className="pb-safe fixed inset-x-0 bottom-0 z-30 md:hidden"
      style={{
        background: "color-mix(in srgb, var(--bg) 86%, transparent)",
        backdropFilter: "blur(16px)",
        borderTop: "1px solid var(--border)",
      }}
    >
      <div className="mx-auto flex max-w-md items-center justify-around px-6 pt-2">
        <Tab
          active={view === "standup"}
          onClick={() => setView("standup")}
          icon={<Mic size={24} />}
          label="Standup"
        />

        <button
          onClick={onCapture}
          aria-label="Add entry"
          className="ring-focus tap -mt-6 grid h-16 w-16 place-items-center rounded-full text-[var(--accent-fg)]"
          style={{
            background: "var(--accent)",
            boxShadow: "0 6px 18px color-mix(in srgb, var(--accent) 45%, transparent)",
          }}
        >
          <Plus size={30} strokeWidth={2.6} />
        </button>

        <Tab
          active={view === "timeline"}
          onClick={() => setView("timeline")}
          icon={<ListChecks size={24} />}
          label="Timeline"
        />
      </div>
    </nav>
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
      className="ring-focus tap flex w-20 flex-col items-center gap-1 rounded-lg py-1.5 text-[11px] font-medium"
      style={{ color: active ? "var(--accent)" : "var(--text-faint)" }}
    >
      {icon}
      {label}
    </button>
  );
}
