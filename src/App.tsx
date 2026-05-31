import { useEffect, useMemo, useRef, useState } from "react";
import { Search, X, Settings, Sun, Moon } from "lucide-react";
import type { Grouping } from "./types";
import { useEntries, type NewEntryInput } from "./hooks/useEntries";
import { useSync } from "./hooks/useSync";
import { SettingsModal } from "./components/SettingsModal";
import { useTheme } from "./hooks/useTheme";
import { exportJSON, importJSON } from "./lib/storage";
import {
  todayKey,
  toDateKey,
  parseKey,
} from "./lib/date";
import {
  startOfWeek,
  isWithinInterval,
  endOfWeek,
  differenceInCalendarDays,
} from "date-fns";
import { Sidebar, type View } from "./components/Sidebar";
import { QuickAdd } from "./components/QuickAdd";
import { Timeline } from "./components/Timeline";
import { StandupPanel } from "./components/StandupPanel";

export default function App() {
  const { entries, all, add, update, remove, toggleStatus, replaceAll, mergeRemote } =
    useEntries();
  const { theme, toggle } = useTheme();
  const sync = useSync(all, mergeRemote);

  const [view, setView] = useState<View>("standup");
  const [grouping, setGrouping] = useState<Grouping>("day");
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [toast, setToast] = useState<string | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const addRef = useRef<HTMLInputElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  // ── Keyboard shortcuts ──────────────────────────────────────────
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const typing =
        target.tagName === "INPUT" || target.tagName === "TEXTAREA";

      if ((e.key === "/" || ((e.metaKey || e.ctrlKey) && e.key === "k")) && !typing) {
        e.preventDefault();
        addRef.current?.focus();
      } else if (e.key === "f" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        searchRef.current?.focus();
      } else if (e.key === "Escape" && typing && target === searchRef.current) {
        setQuery("");
        target.blur();
      } else if (!typing && (e.key === "1" || e.key === "2")) {
        setView(e.key === "1" ? "standup" : "timeline");
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const flash = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2200);
  };

  const handleAdd = (input: NewEntryInput) => {
    add(input);
    flash(input.status === "done" ? "Logged as done ✓" : "Added to plan →");
  };

  // ── Derived data ────────────────────────────────────────────────
  const tags = useMemo(() => {
    const counts = new Map<string, number>();
    for (const e of entries) if (e.tag) counts.set(e.tag, (counts.get(e.tag) ?? 0) + 1);
    return [...counts.entries()]
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag));
  }, [entries]);

  const recentTags = useMemo(() => tags.map((t) => t.tag), [tags]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return entries.filter((e) => {
      if (activeTag && e.tag !== activeTag) return false;
      if (q && !e.text.toLowerCase().includes(q) && !(e.tag ?? "").toLowerCase().includes(q))
        return false;
      return true;
    });
  }, [entries, activeTag, query]);

  const stats = useMemo(() => {
    const tKey = todayKey();
    const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
    const weekEnd = endOfWeek(new Date(), { weekStartsOn: 1 });

    let todayDone = 0;
    let weekDone = 0;
    const doneDays = new Set<string>();
    for (const e of entries) {
      if (e.status !== "done") continue;
      doneDays.add(e.date);
      if (e.date === tKey) todayDone++;
      if (isWithinInterval(parseKey(e.date), { start: weekStart, end: weekEnd }))
        weekDone++;
    }

    // Streak: consecutive days ending today (or yesterday) with ≥1 done entry.
    let streak = 0;
    const cursor = new Date();
    if (!doneDays.has(toDateKey(cursor))) cursor.setDate(cursor.getDate() - 1);
    while (doneDays.has(toDateKey(cursor))) {
      streak++;
      cursor.setDate(cursor.getDate() - 1);
    }
    // Don't count a stale streak (last done > 1 day ago).
    const newest = [...doneDays].sort().pop();
    if (newest && differenceInCalendarDays(new Date(), parseKey(newest)) > 1) streak = 0;

    return { todayDone, weekDone, streak };
  }, [entries]);

  // ── Data import / export ────────────────────────────────────────
  const handleExport = () => {
    const blob = new Blob([exportJSON(entries)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `done-list-${todayKey()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    flash("Exported your entries");
  };

  const handleImport = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      const parsed = importJSON(String(reader.result));
      if (!parsed) return flash("Couldn't read that file");
      // Merge, de-duplicating by id.
      const byId = new Map(entries.map((e) => [e.id, e]));
      for (const e of parsed) byId.set(e.id, e);
      replaceAll([...byId.values()].sort((a, b) => b.createdAt - a.createdAt));
      flash(`Imported ${parsed.length} entries`);
    };
    reader.readAsText(file);
  };

  const emptyHint = activeTag
    ? `No entries tagged #${activeTag} yet.`
    : query
      ? "No entries match your search."
      : "Press / to log the first thing you did today.";

  return (
    <div className="flex h-screen overflow-hidden">
      <div className="hidden md:flex">
        <Sidebar
          view={view}
          setView={setView}
          grouping={grouping}
          setGrouping={setGrouping}
          tags={tags}
          activeTag={activeTag}
          setActiveTag={setActiveTag}
          theme={theme}
          toggleTheme={toggle}
          stats={stats}
          onExport={handleExport}
          onImport={handleImport}
          onOpenSettings={() => setSettingsOpen(true)}
          syncStatus={sync.status}
        />
      </div>

      {/* Main column */}
      <main className="flex min-w-0 flex-1 flex-col">
        {/* Top bar */}
        <header
          className="flex items-center gap-3 border-b px-4 py-3 md:px-8"
          style={{ background: "color-mix(in srgb, var(--bg) 80%, transparent)" }}
        >
          <h1 className="text-sm font-semibold tracking-tight md:hidden">Done</h1>

          {/* Mobile view switch */}
          <div className="ml-auto flex gap-1 md:hidden">
            {(["standup", "timeline"] as View[]).map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className="ring-focus rounded-md px-2.5 py-1 text-xs font-medium capitalize"
                style={{
                  background: view === v ? "var(--accent-soft)" : "transparent",
                  color: view === v ? "var(--accent)" : "var(--text-muted)",
                }}
              >
                {v}
              </button>
            ))}
          </div>

          {/* Mobile theme + settings */}
          <div className="flex items-center gap-0.5 md:hidden">
            <button
              onClick={toggle}
              aria-label="Toggle theme"
              className="ring-focus grid h-8 w-8 place-items-center rounded-lg text-muted"
            >
              {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
            </button>
            <button
              onClick={() => setSettingsOpen(true)}
              aria-label="Sync & settings"
              className="ring-focus relative grid h-8 w-8 place-items-center rounded-lg text-muted"
            >
              <Settings size={16} />
              {sync.status === "synced" && (
                <span
                  className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full"
                  style={{ background: "var(--done)" }}
                />
              )}
            </button>
          </div>

          {/* Search */}
          <div
            className="relative ml-auto hidden items-center md:flex"
            style={{ width: 280 }}
          >
            <Search size={15} className="absolute left-2.5 text-faint" />
            <input
              ref={searchRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search…"
              className="ring-focus w-full rounded-lg py-1.5 pl-8 pr-7 text-sm placeholder:text-[var(--text-faint)] focus:outline-none"
              style={{ background: "var(--bg-subtle)", border: "1px solid var(--border)" }}
            />
            {query && (
              <button
                onClick={() => setQuery("")}
                className="ring-focus absolute right-2 text-faint hover:text-[var(--text)]"
                aria-label="Clear search"
              >
                <X size={14} />
              </button>
            )}
          </div>
        </header>

        {/* Scroll area */}
        <div className="flex-1 overflow-y-auto">
          <div className="mx-auto w-full max-w-2xl px-4 py-6 md:px-6">
            <QuickAdd onAdd={handleAdd} recentTags={recentTags} />

            {(activeTag || query) && (
              <div className="mt-3 flex items-center gap-2 text-xs text-muted">
                <span>Filtered by</span>
                {activeTag && (
                  <button
                    onClick={() => setActiveTag(null)}
                    className="ring-focus inline-flex items-center gap-1 rounded-md px-2 py-0.5"
                    style={{ background: "var(--accent-soft)", color: "var(--accent)" }}
                  >
                    #{activeTag} <X size={11} />
                  </button>
                )}
                {query && <span className="italic">"{query}"</span>}
              </div>
            )}

            <div className="mt-6">
              {view === "standup" ? (
                <StandupPanel entries={entries} onToggle={toggleStatus} />
              ) : (
                <Timeline
                  entries={filtered}
                  grouping={grouping}
                  onToggle={toggleStatus}
                  onUpdate={update}
                  onRemove={remove}
                  onTagClick={(t) => setActiveTag(t)}
                  emptyHint={emptyHint}
                />
              )}
            </div>
          </div>
        </div>
      </main>

      <SettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} sync={sync} />

      {/* Toast */}
      {toast && (
        <div
          className="animate-rise surface fixed bottom-5 left-1/2 z-50 -translate-x-1/2 rounded-lg px-4 py-2 text-sm"
          style={{ boxShadow: "var(--shadow)" }}
        >
          {toast}
        </div>
      )}
    </div>
  );
}
