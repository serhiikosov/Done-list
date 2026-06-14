import { useEffect, useMemo, useRef, useState } from "react";
import { Search, X, Settings, Sun, Moon, Plus, Check } from "lucide-react";
import type { Grouping, Entry, Goal } from "./types";
import { useEntries, type NewEntryInput } from "./hooks/useEntries";
import { useGoals } from "./hooks/useGoals";
import { GoalsView } from "./components/GoalsView";
import { useSync } from "./hooks/useSync";
import { SettingsModal } from "./components/SettingsModal";
import { EntrySheet } from "./components/EntrySheet";
import { PeriodView } from "./components/PeriodView";
import { Confetti } from "./components/Confetti";
import { AISheet } from "./components/AISheet";
import { aiReview } from "./lib/ai";
import { haptic, hapticSuccess } from "./lib/haptics";
import { useTheme } from "./hooks/useTheme";
import { exportJSON, importJSON } from "./lib/storage";
import {
  todayKey,
  toDateKey,
  parseKey,
} from "./lib/date";
import {
  loadReminder,
  saveReminder,
  firedToday,
  markFired,
  notify,
  type ReminderConfig,
} from "./lib/reminder";
import {
  startOfWeek,
  isWithinInterval,
  endOfWeek,
  differenceInCalendarDays,
} from "date-fns";
import { Sidebar, type View } from "./components/Sidebar";
import { Composer } from "./components/Composer";
import { BottomBar } from "./components/BottomBar";

export default function App() {
  const { entries, all, add, update, remove, toggleStatus, replaceAll, mergeRemote } =
    useEntries();
  const { theme, toggle } = useTheme();
  const sync = useSync(all, mergeRemote);
  const { goals, add: addGoal, update: updateGoal, remove: removeGoal } = useGoals();

  const [view, setView] = useState<View>("today");
  const [grouping, setGrouping] = useState<Grouping>("day");
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [toast, setToast] = useState<Toast | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [composerOpen, setComposerOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<Entry | null>(null);
  const [reminder, setReminder] = useState<ReminderConfig>(loadReminder);
  const [burst, setBurst] = useState(0);
  const [aiSheet, setAiSheet] = useState<{ title: string; generate: () => Promise<string> } | null>(
    null
  );

  const searchRef = useRef<HTMLInputElement>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const prevStreak = useRef(0);

  const celebrate = () => {
    setBurst((b) => b + 1);
    hapticSuccess();
  };

  const handleToggle = (id: string) => {
    haptic();
    const e = entries.find((x) => x.id === id);
    toggleStatus(id);
    // Close the loop: completing a goal-linked entry advances that goal.
    if (e?.goalId) {
      const willBeDone = e.status !== "done";
      const g = goals.find((gg) => gg.id === e.goalId);
      if (g) {
        const has = g.done?.includes(e.text) ?? false;
        if (willBeDone && !has) updateGoal(g.id, { done: [...(g.done ?? []), e.text] });
        else if (!willBeDone && has)
          updateGoal(g.id, { done: (g.done ?? []).filter((d) => d !== e.text) });
      }
    }
  };

  const goalProgress = (g: Goal) => {
    const items = g.layers.flatMap((l) => l.items);
    if (items.length === 0) return 0;
    const done = items.filter((i) => g.done?.includes(i)).length;
    return Math.round((done / items.length) * 100);
  };
  const goalsById = useMemo(() => new Map(goals.map((g) => [g.id, g])), [goals]);
  const [focusGoalId, setFocusGoalId] = useState<string | null>(null);
  const openGoal = (goalId: string) => {
    setView("goals");
    setFocusGoalId(goalId);
  };

  // ── Keyboard shortcuts ──────────────────────────────────────────
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const typing =
        target.tagName === "INPUT" || target.tagName === "TEXTAREA";

      if ((e.key === "/" || e.key === "n" || ((e.metaKey || e.ctrlKey) && e.key === "k")) && !typing) {
        e.preventDefault();
        setComposerOpen(true);
      } else if (e.key === "f" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        searchRef.current?.focus();
      } else if (e.key === "Escape" && typing && target === searchRef.current) {
        setQuery("");
        target.blur();
      } else if (!typing && (e.key === "1" || e.key === "2")) {
        setView(e.key === "1" ? "today" : "goals");
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const flash = (message: string, action?: Toast["action"]) => {
    clearTimeout(toastTimer.current);
    setToast({ message, action });
    toastTimer.current = setTimeout(() => setToast(null), action ? 5000 : 2200);
  };

  const handleAdd = (input: NewEntryInput) => {
    // Celebrate the first thing you ship each day.
    if (
      input.status === "done" &&
      (input.date ?? todayKey()) === todayKey() &&
      !entries.some((e) => e.status === "done" && e.date === todayKey())
    ) {
      celebrate();
    }
    add(input);
    flash(input.status === "done" ? "Logged as done ✓" : "Added to plan →");
  };

  const handleRemove = (id: string) => {
    remove(id);
    flash("Entry deleted", {
      label: "Undo",
      onClick: () => {
        update(id, { deleted: false });
        setToast(null);
      },
    });
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

  // Celebrate streak milestones.
  useEffect(() => {
    const milestones = [3, 7, 14, 30, 50, 100, 365];
    if (stats.streak > prevStreak.current && milestones.includes(stats.streak)) {
      setBurst((b) => b + 1);
      hapticSuccess();
    }
    prevStreak.current = stats.streak;
  }, [stats.streak]);

  const handleAddGoalAction = (goal: Goal, action: string) => {
    add({ text: action, status: "planned", date: todayKey(), goalId: goal.id });
    flash("Added to today →");
  };

  const handleRemoveGoalAction = (goal: Goal, action: string) => {
    const e = entries.find((x) => x.goalId === goal.id && x.text === action);
    if (e) remove(e.id);
  };

  const openAIReview = (label: string, doneItems: Entry[]) =>
    setAiSheet({
      title: `AI review · ${label}`,
      generate: () =>
        aiReview(
          label,
          doneItems,
          goals.map((g) => ({ title: g.title, pct: goalProgress(g) }))
        ),
    });

  // ── Daily reminder (local; fires while the app is open) ─────────
  useEffect(() => {
    saveReminder(reminder);
  }, [reminder]);

  useEffect(() => {
    if (!reminder.enabled) return;
    if (typeof Notification !== "undefined" && Notification.permission === "default") {
      Notification.requestPermission().catch(() => {});
    }
    const check = () => {
      const tk = todayKey();
      if (firedToday(tk) || stats.todayDone > 0) return;
      const [h, m] = reminder.time.split(":").map(Number);
      const now = new Date();
      if (now.getHours() > h || (now.getHours() === h && now.getMinutes() >= m)) {
        markFired(tk);
        notify("Log today's wins ✓", "What did you ship today?");
        flash("Log today's wins — what did you ship?", {
          label: "Add",
          onClick: () => {
            setComposerOpen(true);
            setToast(null);
          },
        });
      }
    };
    check();
    const id = setInterval(check, 60000);
    return () => clearInterval(id);
  }, [reminder, stats.todayDone]);

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
      <main className="relative flex min-w-0 flex-1 flex-col">
        {/* Top bar */}
        <header
          className="pt-safe sticky top-0 z-20 flex items-center gap-3 px-5 py-3 md:border-b md:px-8"
          style={{
            background: "color-mix(in srgb, var(--bg) 82%, transparent)",
            backdropFilter: "blur(12px)",
          }}
        >
          {/* Mobile brand */}
          <div className="flex items-center gap-2 md:hidden">
            <span
              className="grid h-8 w-8 place-items-center rounded-[10px] text-[var(--accent-fg)]"
              style={{ background: "var(--accent)" }}
            >
              <Check size={17} strokeWidth={3} />
            </span>
            <span className="text-[17px] font-semibold tracking-tight">Done</span>
          </div>

          {/* Desktop: search + New */}
          <div className="ml-auto hidden items-center gap-2 md:flex">
            <div className="relative flex items-center" style={{ width: 260 }}>
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
            <button
              onClick={() => setComposerOpen(true)}
              className="ring-focus tap inline-flex h-9 items-center gap-1.5 rounded-lg px-3.5 text-sm font-medium text-[var(--accent-fg)]"
              style={{ background: "var(--accent)" }}
            >
              <Plus size={16} strokeWidth={2.6} /> New
            </button>
          </div>

          {/* Mobile theme + settings */}
          <div className="ml-auto flex items-center gap-1 md:hidden">
            <button
              onClick={toggle}
              aria-label="Toggle theme"
              className="ring-focus tap grid h-11 w-11 place-items-center rounded-full text-muted"
            >
              {theme === "dark" ? <Sun size={21} /> : <Moon size={21} />}
            </button>
            <button
              onClick={() => setSettingsOpen(true)}
              aria-label="Sync & settings"
              className="ring-focus tap relative grid h-11 w-11 place-items-center rounded-full text-muted"
            >
              <Settings size={21} />
              {sync.status !== "disabled" && (
                <span
                  className="absolute right-2 top-2 h-2 w-2 rounded-full"
                  style={{ background: sync.status === "synced" ? "var(--done)" : "var(--planned)" }}
                />
              )}
            </button>
          </div>
        </header>

        {/* Scroll area */}
        <div className="flex-1 overflow-y-auto">
          <div key={view} className="animate-in mx-auto w-full max-w-2xl px-5 pb-32 pt-5 md:px-6 md:pb-12">
            {view === "goals" ? (
              <GoalsView
                goals={goals}
                entries={entries}
                progressOf={goalProgress}
                focusGoalId={focusGoalId}
                onFocusConsumed={() => setFocusGoalId(null)}
                onAdd={addGoal}
                onUpdate={updateGoal}
                onRemove={removeGoal}
                onAddAction={handleAddGoalAction}
                onRemoveAction={handleRemoveGoalAction}
                onOpenSettings={() => setSettingsOpen(true)}
              />
            ) : (
              <div>
                {activeTag && (
                  <div className="mb-4 flex items-center gap-2 text-xs text-muted">
                    <span>Filtered by</span>
                    <button
                      onClick={() => setActiveTag(null)}
                      className="ring-focus inline-flex items-center gap-1 rounded-md px-2 py-0.5"
                      style={{ background: "var(--accent-soft)", color: "var(--accent)" }}
                    >
                      #{activeTag} <X size={11} />
                    </button>
                  </div>
                )}
                <PeriodView
                  entries={filtered}
                  grouping={grouping}
                  onGroupingChange={setGrouping}
                  onToggle={handleToggle}
                  onEdit={setEditingEntry}
                  onRemove={handleRemove}
                  onTagClick={(t) => setActiveTag(t)}
                  onAIReview={openAIReview}
                  goalTitleOf={(gid) => goalsById.get(gid)?.title}
                  onOpenGoal={openGoal}
                />
              </div>
            )}
          </div>
        </div>

        {/* Mobile bottom navigation + capture */}
        <BottomBar view={view} setView={setView} onCapture={() => setComposerOpen(true)} />
      </main>

      <Composer
        open={composerOpen}
        onClose={() => setComposerOpen(false)}
        onAdd={handleAdd}
        recentTags={recentTags}
      />
      <SettingsModal
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        sync={sync}
        reminder={reminder}
        onChangeReminder={setReminder}
      />
      <EntrySheet
        entry={editingEntry}
        onClose={() => setEditingEntry(null)}
        onUpdate={update}
        onRemove={handleRemove}
        recentTags={recentTags}
      />
      <AISheet
        open={!!aiSheet}
        title={aiSheet?.title ?? ""}
        generate={aiSheet?.generate ?? null}
        onClose={() => setAiSheet(null)}
        onOpenSettings={() => {
          setAiSheet(null);
          setSettingsOpen(true);
        }}
      />
      <Confetti fire={burst} />

      {/* Toast */}
      {toast && (
        <div
          className="animate-rise surface fixed bottom-28 left-1/2 z-50 flex -translate-x-1/2 items-center gap-3 rounded-full py-2.5 pl-5 pr-2.5 text-[15px] md:bottom-6"
          style={{ boxShadow: "var(--shadow)" }}
        >
          <span>{toast.message}</span>
          {toast.action && (
            <button
              onClick={toast.action.onClick}
              className="ring-focus tap rounded-full px-3 py-1 text-xs font-semibold"
              style={{ background: "var(--accent-soft)", color: "var(--accent)" }}
            >
              {toast.action.label}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

interface Toast {
  message: string;
  action?: { label: string; onClick: () => void };
}
