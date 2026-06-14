import { useRef } from "react";
import {
  CalendarDays,
  CalendarRange,
  Calendar,
  CalendarClock,
  ListChecks,
  Mic,
  Moon,
  Sun,
  Download,
  Upload,
  Flame,
  Settings,
  Target,
} from "lucide-react";
import type { Grouping } from "../types";
import type { SyncStatus } from "../hooks/useSync";

export type View = "timeline" | "standup" | "goals";

interface Props {
  view: View;
  setView: (v: View) => void;
  grouping: Grouping;
  setGrouping: (g: Grouping) => void;
  tags: { tag: string; count: number }[];
  activeTag: string | null;
  setActiveTag: (t: string | null) => void;
  theme: "light" | "dark";
  toggleTheme: () => void;
  stats: { todayDone: number; weekDone: number; streak: number };
  onExport: () => void;
  onImport: (file: File) => void;
  onOpenSettings: () => void;
  syncStatus: SyncStatus;
}

const syncDot: Record<SyncStatus, string> = {
  disabled: "transparent",
  signedOut: "var(--planned)",
  syncing: "var(--accent)",
  synced: "var(--done)",
  error: "var(--planned)",
};

const groupingOptions: { id: Grouping; label: string; icon: typeof Calendar }[] = [
  { id: "day", label: "Day", icon: CalendarDays },
  { id: "week", label: "Week", icon: CalendarRange },
  { id: "month", label: "Month", icon: Calendar },
  { id: "year", label: "Year", icon: CalendarClock },
];

function NavButton({
  active,
  onClick,
  icon: Icon,
  children,
  badge,
}: {
  active: boolean;
  onClick: () => void;
  icon: typeof Calendar;
  children: React.ReactNode;
  badge?: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className="ring-focus flex w-full items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-sm font-medium transition-colors"
      style={{
        background: active ? "var(--accent-soft)" : "transparent",
        color: active ? "var(--accent)" : "var(--text-muted)",
      }}
      onMouseEnter={(e) => {
        if (!active) e.currentTarget.style.background = "var(--bg-hover)";
      }}
      onMouseLeave={(e) => {
        if (!active) e.currentTarget.style.background = "transparent";
      }}
    >
      <Icon size={16} />
      <span className="flex-1 text-left">{children}</span>
      {badge}
    </button>
  );
}

export function Sidebar(props: Props) {
  const fileRef = useRef<HTMLInputElement>(null);

  return (
    <aside
      className="flex h-full w-[244px] shrink-0 flex-col gap-6 border-r px-3 py-4"
      style={{ background: "var(--bg)" }}
    >
      {/* Brand */}
      <div className="flex items-center gap-2 px-2">
        <span
          className="grid h-7 w-7 place-items-center rounded-lg text-[var(--accent-fg)]"
          style={{ background: "var(--accent)" }}
        >
          <ListChecks size={16} />
        </span>
        <div className="leading-tight">
          <div className="text-sm font-semibold tracking-tight">Done</div>
          <div className="text-[11px] text-faint">what you actually shipped</div>
        </div>
      </div>

      {/* Views */}
      <nav className="flex flex-col gap-0.5">
        <NavButton
          active={props.view === "standup"}
          onClick={() => props.setView("standup")}
          icon={Mic}
        >
          Standup
        </NavButton>
        <NavButton
          active={props.view === "timeline"}
          onClick={() => props.setView("timeline")}
          icon={ListChecks}
        >
          Timeline
        </NavButton>
        <NavButton
          active={props.view === "goals"}
          onClick={() => props.setView("goals")}
          icon={Target}
        >
          Goals
        </NavButton>
      </nav>

      {/* Grouping (only meaningful for timeline) */}
      {props.view === "timeline" && (
        <div className="animate-in">
          <div className="mb-1.5 px-2.5 text-[11px] font-semibold uppercase tracking-wider text-faint">
            Group by
          </div>
          <div className="flex flex-col gap-0.5">
            {groupingOptions.map((o) => (
              <NavButton
                key={o.id}
                active={props.grouping === o.id}
                onClick={() => props.setGrouping(o.id)}
                icon={o.icon}
              >
                {o.label}
              </NavButton>
            ))}
          </div>
        </div>
      )}

      {/* Tags */}
      {props.tags.length > 0 && (
        <div className="min-h-0 flex-1 overflow-y-auto">
          <div className="mb-1.5 px-2.5 text-[11px] font-semibold uppercase tracking-wider text-faint">
            Tags
          </div>
          <div className="flex flex-col gap-0.5">
            {props.tags.map(({ tag, count }) => {
              const active = props.activeTag === tag;
              return (
                <button
                  key={tag}
                  onClick={() => props.setActiveTag(active ? null : tag)}
                  className="ring-focus flex items-center gap-2 rounded-lg px-2.5 py-1 text-sm transition-colors"
                  style={{
                    background: active ? "var(--accent-soft)" : "transparent",
                    color: active ? "var(--accent)" : "var(--text-muted)",
                  }}
                  onMouseEnter={(e) => {
                    if (!active) e.currentTarget.style.background = "var(--bg-hover)";
                  }}
                  onMouseLeave={(e) => {
                    if (!active) e.currentTarget.style.background = "transparent";
                  }}
                >
                  <span className="truncate">#{tag}</span>
                  <span className="ml-auto text-xs text-faint">{count}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Spacer when no tags */}
      {props.tags.length === 0 && <div className="flex-1" />}

      {/* Stats */}
      <div
        className="rounded-xl px-3 py-2.5"
        style={{ background: "var(--bg-subtle)", border: "1px solid var(--border)" }}
      >
        <div className="grid grid-cols-3 gap-1 text-center">
          <Stat value={props.stats.todayDone} label="today" />
          <Stat value={props.stats.weekDone} label="this wk" />
          <Stat
            value={props.stats.streak}
            label="streak"
            icon={props.stats.streak > 0 ? <Flame size={11} style={{ color: "var(--planned)" }} /> : undefined}
          />
        </div>
      </div>

      {/* Footer actions */}
      <div className="flex items-center gap-1 px-1">
        <IconBtn onClick={props.toggleTheme} label="Toggle theme">
          {props.theme === "dark" ? <Sun size={15} /> : <Moon size={15} />}
        </IconBtn>
        <IconBtn onClick={props.onExport} label="Export JSON">
          <Download size={15} />
        </IconBtn>
        <IconBtn onClick={() => fileRef.current?.click()} label="Import JSON">
          <Upload size={15} />
        </IconBtn>
        <IconBtn onClick={props.onOpenSettings} label="Sync & settings">
          <span className="relative">
            <Settings size={15} />
            {props.syncStatus !== "disabled" && (
              <span
                className="absolute -right-0.5 -top-0.5 h-1.5 w-1.5 rounded-full"
                style={{ background: syncDot[props.syncStatus] }}
              />
            )}
          </span>
        </IconBtn>
        <input
          ref={fileRef}
          type="file"
          accept="application/json"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) props.onImport(f);
            e.target.value = "";
          }}
        />
      </div>
    </aside>
  );
}

function Stat({
  value,
  label,
  icon,
}: {
  value: number;
  label: string;
  icon?: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-center justify-center gap-0.5 text-base font-semibold tabular-nums">
        {icon}
        {value}
      </div>
      <div className="text-[10px] uppercase tracking-wide text-faint">{label}</div>
    </div>
  );
}

function IconBtn({
  onClick,
  label,
  children,
}: {
  onClick: () => void;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      title={label}
      className="ring-focus grid h-8 w-8 place-items-center rounded-lg text-muted transition-colors"
      onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-hover)")}
      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
    >
      {children}
    </button>
  );
}
