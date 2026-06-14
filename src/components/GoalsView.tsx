import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Plus, X, Sparkles, RefreshCw, Trash2, Target, Check, ChevronRight } from "lucide-react";
import type { Goal, GoalHorizon, GoalPace, Entry } from "../types";
import { aiBreakdownGoal, aiNextWeek } from "../lib/ai";
import { useScrollLock } from "../hooks/useScrollLock";
import type { NewGoal } from "../hooks/useGoals";

interface Props {
  goals: Goal[];
  entries: Entry[];
  progressOf: (g: Goal) => number;
  focusGoalId: string | null;
  onFocusConsumed: () => void;
  onAdd: (g: NewGoal) => Goal;
  onUpdate: (id: string, patch: Partial<Goal>) => void;
  onRemove: (id: string) => void;
  onAddAction: (goal: Goal, action: string) => void;
  onRemoveAction: (goal: Goal, action: string) => void;
  onOpenSettings: () => void;
}

const HORIZON_LABEL: Record<GoalHorizon, string> = {
  "3-year": "3y",
  "1-year": "1y",
  quarter: "Quarter",
  month: "Month",
  week: "This week",
};

const HORIZON_OPTIONS: { id: GoalHorizon; label: string }[] = [
  { id: "month", label: "This month" },
  { id: "quarter", label: "This quarter" },
  { id: "1-year", label: "1 year" },
  { id: "3-year", label: "3 years" },
];

export function GoalsView({
  goals,
  entries,
  progressOf,
  focusGoalId,
  onFocusConsumed,
  onAdd,
  onUpdate,
  onRemove,
  onAddAction,
  onRemoveAction,
  onOpenSettings,
}: Props) {
  const [composerOpen, setComposerOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [autoRunId, setAutoRunId] = useState<string | null>(null);
  const selected = goals.find((g) => g.id === selectedId) ?? null;

  // Open a specific goal when navigated here from a Today entry chip.
  useEffect(() => {
    if (focusGoalId) {
      setSelectedId(focusGoalId);
      onFocusConsumed();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusGoalId]);

  return (
    <div className="animate-in">
      <div className="mb-5 flex items-end justify-between gap-3">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-faint">Goals</div>
          <h1 className="mt-1 text-[30px] font-bold leading-tight tracking-tight">Where I'm headed</h1>
        </div>
        {goals.length > 0 && (
          <button
            onClick={() => setComposerOpen(true)}
            className="ring-focus tap inline-flex h-10 shrink-0 items-center gap-1.5 rounded-full px-4 text-[15px] font-medium text-[var(--accent-fg)]"
            style={{ background: "var(--accent)" }}
          >
            <Plus size={17} strokeWidth={2.6} /> New
          </button>
        )}
      </div>

      {goals.length === 0 ? (
        <div className="mt-12 flex flex-col items-center text-center">
          <div
            className="grid h-14 w-14 place-items-center rounded-2xl"
            style={{ background: "var(--accent-soft)", color: "var(--accent)" }}
          >
            <Target size={26} />
          </div>
          <h3 className="mt-4 text-lg font-semibold">Set your first goal</h3>
          <p className="mt-1 max-w-xs text-sm text-muted">
            Write what you want — like “gain 6kg, now 72kg”. AI breaks it down into year, quarter,
            month and this week's actions.
          </p>
          <button
            onClick={() => setComposerOpen(true)}
            className="ring-focus tap mt-5 inline-flex h-11 items-center gap-1.5 rounded-full px-5 text-sm font-semibold text-[var(--accent-fg)]"
            style={{ background: "var(--accent)" }}
          >
            <Plus size={17} strokeWidth={2.6} /> Add a goal
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {goals.map((g) => {
            const week = g.layers.find((l) => l.horizon === "week");
            return (
              <button
                key={g.id}
                onClick={() => setSelectedId(g.id)}
                className="ring-focus tap flex items-center gap-3 rounded-2xl px-4 py-4 text-left"
                style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)" }}
              >
                <span
                  className="grid h-9 w-9 shrink-0 place-items-center rounded-xl"
                  style={{ background: "var(--accent-soft)", color: "var(--accent)" }}
                >
                  <Target size={18} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[16px] font-semibold leading-snug">{g.title}</span>
                  <span className="mt-0.5 block text-[13px] text-muted">
                    {g.layers.length
                      ? `${week ? `${week.items.length} actions this week` : "Planned"} · ${HORIZON_OPTIONS.find((h) => h.id === g.horizon)?.label}`
                      : "Tap to plan with AI"}
                  </span>
                  {g.layers.length > 0 && (
                    <span className="mt-2 flex items-center gap-2">
                      <span
                        className="h-1.5 flex-1 overflow-hidden rounded-full"
                        style={{ background: "var(--bg-subtle)" }}
                      >
                        <span
                          className="block h-full rounded-full"
                          style={{ width: `${progressOf(g)}%`, background: "var(--done)" }}
                        />
                      </span>
                      <span className="text-[12px] tabular-nums text-faint">{progressOf(g)}%</span>
                    </span>
                  )}
                </span>
                <ChevronRight size={18} className="shrink-0 self-start text-faint" />
              </button>
            );
          })}
        </div>
      )}

      {composerOpen && (
        <GoalComposer
          onClose={() => setComposerOpen(false)}
          onSave={(g) => {
            const created = onAdd(g);
            setComposerOpen(false);
            setAutoRunId(created.id);
            setSelectedId(created.id);
          }}
        />
      )}

      {selected && (
        <GoalDetailSheet
          goal={selected}
          otherGoals={goals.filter((g) => g.id !== selected.id)}
          addedActions={entries
            .filter((e) => e.goalId === selected.id)
            .map((e) => e.text)}
          autoRun={autoRunId === selected.id}
          onClose={() => {
            setAutoRunId(null);
            setSelectedId(null);
          }}
          onUpdate={onUpdate}
          onRemove={(id) => {
            onRemove(id);
            setSelectedId(null);
          }}
          onAddAction={onAddAction}
          onRemoveAction={onRemoveAction}
          onOpenSettings={onOpenSettings}
        />
      )}
    </div>
  );
}

function GoalComposer({ onClose, onSave }: { onClose: () => void; onSave: (g: NewGoal) => void }) {
  const [title, setTitle] = useState("");
  const [detail, setDetail] = useState("");
  const [horizon, setHorizon] = useState<GoalHorizon>("1-year");
  const [auto, setAuto] = useState(true);
  const [trackNum, setTrackNum] = useState(false);
  const [unit, setUnit] = useState("");
  const [current, setCurrent] = useState("");
  const [target, setTarget] = useState("");
  const ref = useRef<HTMLInputElement>(null);
  useScrollLock(true);
  useEffect(() => {
    const t = setTimeout(() => ref.current?.focus(), 120);
    return () => clearTimeout(t);
  }, []);

  const submit = () => {
    if (!title.trim()) return;
    const c = parseFloat(current);
    const t = parseFloat(target);
    const metric =
      trackNum && unit.trim() && !Number.isNaN(c) && !Number.isNaN(t)
        ? { unit: unit.trim(), start: c, current: c, target: t }
        : undefined;
    onSave({ title, detail, horizon, auto, metric });
  };

  return (
    <Overlay onClose={onClose}>
      {/* iOS-style header: Cancel · title · Create (always above the keyboard) */}
      <div className="flex items-center justify-between px-4 pt-4">
        <button onClick={onClose} className="ring-focus tap px-1 text-[15px] text-muted">
          Cancel
        </button>
        <span className="text-[15px] font-semibold">New goal</span>
        <button
          onClick={submit}
          disabled={!title.trim()}
          className="ring-focus tap px-1 text-[15px] font-semibold disabled:opacity-40"
          style={{ color: "var(--accent)" }}
        >
          Create
        </button>
      </div>
      <div className="flex max-h-[68vh] flex-col gap-4 overflow-y-auto px-5 pb-5 pt-4">
        <input
          ref={ref}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") submit();
          }}
          placeholder="What do you want to achieve?"
          className="ring-focus w-full rounded-2xl px-4 py-3 text-[17px] placeholder:text-[var(--text-faint)] focus:outline-none"
          style={{ background: "var(--bg-subtle)", border: "1px solid var(--border)" }}
        />
        <textarea
          value={detail}
          onChange={(e) => setDetail(e.target.value)}
          rows={2}
          placeholder="Context (optional) — e.g. gain 6kg, currently 72kg"
          className="ring-focus w-full resize-none rounded-2xl px-4 py-3 text-[15px] placeholder:text-[var(--text-faint)] focus:outline-none"
          style={{ background: "var(--bg-subtle)", border: "1px solid var(--border)" }}
        />
        <div>
          <div className="mb-2 text-xs font-medium uppercase tracking-wider text-faint">Timeframe</div>
          <button
            onClick={() => setAuto(true)}
            className="ring-focus tap mb-2 flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left transition-colors"
            style={{
              background: auto ? "var(--accent-soft)" : "var(--bg-subtle)",
              border: `1.5px solid ${auto ? "var(--accent)" : "var(--border)"}`,
            }}
          >
            <span
              className="grid h-7 w-7 shrink-0 place-items-center rounded-full"
              style={{ background: auto ? "var(--accent)" : "var(--bg-elevated)", color: auto ? "#fff" : "var(--text-faint)" }}
            >
              <Sparkles size={15} />
            </span>
            <span className="min-w-0">
              <span className="block text-[15px] font-semibold" style={{ color: auto ? "var(--accent)" : "var(--text)" }}>
                Let AI choose
              </span>
              <span className="block text-[12px] text-faint">Picks a realistic, healthy timeframe</span>
            </span>
          </button>
          <div className="grid grid-cols-2 gap-2">
            {HORIZON_OPTIONS.map((h) => (
              <button
                key={h.id}
                onClick={() => {
                  setHorizon(h.id);
                  setAuto(false);
                }}
                className="ring-focus tap rounded-xl px-3 py-2.5 text-[15px] font-medium transition-colors"
                style={{
                  background: !auto && horizon === h.id ? "var(--accent-soft)" : "var(--bg-subtle)",
                  color: !auto && horizon === h.id ? "var(--accent)" : "var(--text-muted)",
                  border: `1.5px solid ${!auto && horizon === h.id ? "var(--accent)" : "var(--border)"}`,
                }}
              >
                {h.label}
              </button>
            ))}
          </div>
        </div>

        {/* Optional numeric metric */}
        <div>
          <button
            onClick={() => setTrackNum((v) => !v)}
            className="ring-focus tap flex w-full items-center justify-between rounded-xl px-3 py-2.5"
            style={{ background: "var(--bg-subtle)", border: "1px solid var(--border)" }}
          >
            <span className="text-[15px]">Track a number (optional)</span>
            <span className="text-[13px] text-faint">{trackNum ? "On" : "Off"}</span>
          </button>
          {trackNum && (
            <div className="mt-2 grid grid-cols-3 gap-2">
              <NumField label="Now" value={current} onChange={setCurrent} placeholder="72" />
              <NumField label="Target" value={target} onChange={setTarget} placeholder="78" />
              <NumField label="Unit" value={unit} onChange={setUnit} placeholder="kg" text />
            </div>
          )}
        </div>
      </div>
    </Overlay>
  );
}

function GoalDetailSheet({
  goal,
  otherGoals,
  addedActions,
  autoRun,
  onClose,
  onUpdate,
  onRemove,
  onAddAction,
  onRemoveAction,
  onOpenSettings,
}: {
  goal: Goal;
  otherGoals: Goal[];
  addedActions: string[];
  autoRun: boolean;
  onClose: () => void;
  onUpdate: (id: string, patch: Partial<Goal>) => void;
  onRemove: (id: string) => void;
  onAddAction: (goal: Goal, action: string) => void;
  onRemoveAction: (goal: Goal, action: string) => void;
  onOpenSettings: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [picked, setPicked] = useState<GoalHorizon | null>(null);
  const [confirm, setConfirm] = useState<null | "replan" | "delete">(null);
  const [metricInput, setMetricInput] = useState(goal.metric ? String(goal.metric.current) : "");
  const [nextWeekNote, setNextWeekNote] = useState<string | null>(null);
  const ranRef = useRef(false);
  useScrollLock(true);
  const pace = goal.pace ?? "balanced";

  const planNextWeek = async () => {
    setLoading(true);
    setError(null);
    try {
      const weekItems = goal.layers.find((l) => l.horizon === "week")?.items ?? [];
      const doneWeek = weekItems.filter((i) => goal.done?.includes(i));
      const r = await aiNextWeek(goal, doneWeek);
      const newLayers = goal.layers.map((l) =>
        l.horizon === "week" ? { ...l, items: r.items } : l
      );
      const stillPlanned = new Set(
        goal.layers.filter((l) => l.horizon !== "week").flatMap((l) => l.items)
      );
      onUpdate(goal.id, {
        layers: newLayers,
        done: (goal.done ?? []).filter((d) => stillPlanned.has(d)),
        added: [],
      });
      setNextWeekNote(r.note || "New week planned.");
      setTimeout(() => setNextWeekNote(null), 4000);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  };

  const layers = goal.layers;
  const activeHorizon =
    picked && layers.some((l) => l.horizon === picked)
      ? picked
      : layers[layers.length - 1]?.horizon;
  const activeLayer = layers.find((l) => l.horizon === activeHorizon);

  const breakdown = async (over?: Partial<Goal>) => {
    const g = { ...goal, ...over };
    setLoading(true);
    setError(null);
    try {
      const r = await aiBreakdownGoal(
        g,
        otherGoals.map((o) => ({ title: o.title, horizon: o.horizon }))
      );
      // Keep `auto` as-is: auto goals should re-pick their timeframe on every
      // replan (so Chill/Intense actually changes the horizon).
      onUpdate(goal.id, {
        summary: r.summary,
        layers: r.layers,
        horizon: r.horizon ?? g.horizon,
        ...over,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  };

  // Auto-generate right after the goal is created (skip the extra tap).
  useEffect(() => {
    if (autoRun && !ranRef.current && goal.layers.length === 0) {
      ranRef.current = true;
      breakdown();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoRun]);

  const needsKey = error?.includes("API key");

  const m = goal.metric;
  const metricPct =
    m && m.target !== m.start
      ? Math.max(0, Math.min(100, Math.round(((m.current - m.start) / (m.target - m.start)) * 100)))
      : 0;
  const trajectory = (() => {
    if (!m) return null;
    const days: Record<GoalHorizon, number> = { week: 7, month: 30, quarter: 91, "1-year": 365, "3-year": 1095 };
    const total = (days[goal.horizon] ?? 365) * 86400000;
    const elapsed = Math.max(0, Math.min(1, (Date.now() - goal.createdAt) / total));
    const diff = metricPct - Math.round(elapsed * 100);
    if (Math.abs(diff) < 6) return { text: "On track", color: "var(--text-muted)" };
    if (diff >= 6) return { text: `Ahead of pace (+${diff}%)`, color: "var(--done)" };
    return { text: `Behind pace (${diff}%)`, color: "var(--planned)" };
  })();
  const logMetric = () => {
    const v = parseFloat(metricInput);
    if (!m || Number.isNaN(v)) return;
    onUpdate(goal.id, { metric: { ...m, current: v } });
  };
  const weekLayer = layers.find((l) => l.horizon === "week");
  const allWeekDone =
    !!weekLayer && weekLayer.items.length > 0 && weekLayer.items.every((i) => goal.done?.includes(i));

  const PACES: { id: GoalPace; label: string }[] = [
    { id: "chill", label: "Chill" },
    { id: "balanced", label: "Balanced" },
    { id: "intense", label: "Intense" },
  ];

  return (
    <Overlay onClose={onClose}>
      <div className="flex items-start justify-between gap-3 px-5 pb-1 pt-4">
        <div className="min-w-0">
          <h3 className="text-[17px] font-semibold leading-snug">{goal.title}</h3>
          {goal.detail && <p className="mt-0.5 text-[13px] text-muted">{goal.detail}</p>}
        </div>
        <button
          onClick={onClose}
          className="ring-focus tap grid h-8 w-8 shrink-0 place-items-center rounded-full text-muted"
          style={{ background: "var(--bg-subtle)" }}
          aria-label="Close"
        >
          <X size={15} />
        </button>
      </div>

      <div className="max-h-[60vh] overflow-y-auto px-5 pb-2 pt-3">
        {layers.length === 0 ? (
          <div className="flex flex-col items-center py-6 text-center">
            {loading ? (
              <div className="flex items-center gap-2 text-[15px] text-muted">
                <RefreshCw size={16} className="animate-spin" /> Planning…
              </div>
            ) : (
              <>
                <p className="mb-4 max-w-xs text-sm text-muted">
                  Let AI break this goal into milestones across horizons and concrete actions for
                  this week.
                </p>
                {error && (
                  <p
                    className="mb-3 rounded-xl px-3 py-2 text-[13px]"
                    style={{ background: "var(--planned-soft)", color: "var(--planned)" }}
                  >
                    {error}
                  </p>
                )}
                <button
                  onClick={needsKey ? onOpenSettings : () => breakdown()}
                  className="ring-focus tap inline-flex h-11 items-center gap-1.5 rounded-full px-5 text-sm font-semibold text-[var(--accent-fg)]"
                  style={{ background: "var(--accent)" }}
                >
                  <Sparkles size={16} /> {needsKey ? "Add API key" : "Break down with AI"}
                </button>
              </>
            )}
          </div>
        ) : (
          <>
            {/* Metric tracker */}
            {m && (
              <div
                className="mb-4 rounded-2xl p-3"
                style={{ background: "var(--bg-subtle)", border: "1px solid var(--border)" }}
              >
                <div className="flex items-baseline justify-between">
                  <span className="text-[16px] font-semibold">
                    {m.current} → {m.target} {m.unit}
                  </span>
                  {trajectory && (
                    <span className="text-[12px] font-medium" style={{ color: trajectory.color }}>
                      {trajectory.text}
                    </span>
                  )}
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full" style={{ background: "var(--bg-elevated)" }}>
                    <div className="h-full rounded-full" style={{ width: `${metricPct}%`, background: "var(--done)" }} />
                  </div>
                  <span className="text-[12px] tabular-nums text-faint">{metricPct}%</span>
                </div>
                <div className="mt-2.5 flex items-center gap-2">
                  <input
                    value={metricInput}
                    onChange={(e) => setMetricInput(e.target.value)}
                    inputMode="decimal"
                    placeholder={`Current ${m.unit}`}
                    className="ring-focus h-9 flex-1 rounded-xl px-3 text-[14px] focus:outline-none"
                    style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)" }}
                  />
                  <button
                    onClick={logMetric}
                    className="ring-focus tap h-9 rounded-xl px-3.5 text-[13px] font-semibold text-[var(--accent-fg)]"
                    style={{ background: "var(--accent)" }}
                  >
                    Log
                  </button>
                </div>
              </div>
            )}

            {/* Pace control — replans with the chosen intensity */}
            <div className="mb-4 flex items-center gap-2">
              <span className="text-xs font-medium uppercase tracking-wider text-faint">Pace</span>
              <div
                className="flex gap-0.5 rounded-lg p-0.5"
                style={{ background: "var(--bg-subtle)", border: "1px solid var(--border)" }}
              >
                {PACES.map((p) => (
                  <button
                    key={p.id}
                    disabled={loading}
                    onClick={() => pace !== p.id && breakdown({ pace: p.id, auto: true })}
                    className="ring-focus tap rounded-md px-2.5 py-1 text-[12px] font-medium disabled:opacity-50"
                    style={{
                      background: pace === p.id ? "var(--bg-elevated)" : "transparent",
                      color: pace === p.id ? "var(--text)" : "var(--text-muted)",
                      boxShadow: pace === p.id ? "var(--shadow)" : "none",
                    }}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
              {loading && <RefreshCw size={14} className="animate-spin text-faint" />}
            </div>
            {goal.summary && (
              <p className="mb-4 text-[14px] leading-relaxed text-muted">{goal.summary}</p>
            )}
            {/* Horizon switcher */}
            <div
              className="mb-4 flex gap-0.5 overflow-x-auto rounded-xl p-0.5"
              style={{ background: "var(--bg-subtle)", border: "1px solid var(--border)" }}
            >
              {layers.map((l) => (
                <button
                  key={l.horizon}
                  onClick={() => setPicked(l.horizon)}
                  className="ring-focus tap shrink-0 rounded-lg px-3 py-1.5 text-[13px] font-medium"
                  style={{
                    background: activeHorizon === l.horizon ? "var(--bg-elevated)" : "transparent",
                    color: activeHorizon === l.horizon ? "var(--text)" : "var(--text-muted)",
                    boxShadow: activeHorizon === l.horizon ? "var(--shadow)" : "none",
                  }}
                >
                  {HORIZON_LABEL[l.horizon]}
                </button>
              ))}
            </div>

            {activeLayer && (
              <div className="mb-3">
                {activeLayer.label && (
                  <p className="text-[15px] font-medium" style={{ color: "var(--accent)" }}>
                    {activeLayer.label}
                  </p>
                )}
                {(() => {
                  const total = activeLayer.items.length;
                  const done = activeLayer.items.filter((i) => goal.done?.includes(i)).length;
                  return (
                    <div className="mt-1.5 flex items-center gap-2">
                      <div
                        className="h-1.5 flex-1 overflow-hidden rounded-full"
                        style={{ background: "var(--bg-subtle)" }}
                      >
                        <div
                          className="h-full rounded-full transition-all"
                          style={{ width: `${total ? (done / total) * 100 : 0}%`, background: "var(--done)" }}
                        />
                      </div>
                      <span className="text-[12px] tabular-nums text-faint">
                        {done}/{total}
                      </span>
                    </div>
                  );
                })()}
              </div>
            )}

            <div
              className="overflow-hidden rounded-2xl"
              style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)" }}
            >
              {activeLayer?.items.map((item, i) => {
                const isWeek = activeHorizon === "week";
                const isAdded = addedActions.includes(item);
                const isDone = goal.done?.includes(item) ?? false;
                const toggleDone = () =>
                  onUpdate(goal.id, {
                    done: isDone
                      ? (goal.done ?? []).filter((d) => d !== item)
                      : [...(goal.done ?? []), item],
                  });
                return (
                  <div
                    key={`${activeHorizon}-${i}`}
                    className="flex items-center gap-3 px-4 py-3"
                    style={i > 0 ? { borderTop: "1px solid var(--border)" } : undefined}
                  >
                    <button
                      onClick={toggleDone}
                      aria-label={isDone ? "Mark not done" : "Mark done"}
                      className="ring-focus tap grid h-[22px] w-[22px] shrink-0 place-items-center rounded-full border-2 transition-all"
                      style={{
                        background: isDone ? "var(--done)" : "transparent",
                        borderColor: isDone ? "var(--done)" : "var(--border-strong)",
                      }}
                    >
                      {isDone && <Check size={13} strokeWidth={3} color="#fff" />}
                    </button>
                    <span
                      className="min-w-0 flex-1 text-[16px] leading-snug"
                      style={
                        isDone
                          ? { color: "var(--text-faint)", textDecoration: "line-through" }
                          : undefined
                      }
                    >
                      {item}
                    </span>
                    {isWeek && (
                      <button
                        onClick={() => (isAdded ? onRemoveAction(goal, item) : onAddAction(goal, item))}
                        className="ring-focus tap inline-flex h-8 shrink-0 items-center gap-1 rounded-full px-2.5 text-[12px] font-medium"
                        style={{
                          background: isAdded ? "var(--done-soft)" : "var(--accent-soft)",
                          color: isAdded ? "var(--done)" : "var(--accent)",
                        }}
                        title={isAdded ? "Remove from Today" : "Add to Today"}
                      >
                        {isAdded ? <Check size={13} /> : <Plus size={13} />}
                        {isAdded ? "Added" : "Today"}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
            {activeHorizon === "week" && (
              <button
                onClick={planNextWeek}
                disabled={loading}
                className="ring-focus tap mt-3 inline-flex h-11 w-full items-center justify-center gap-1.5 rounded-2xl text-[14px] font-semibold"
                style={
                  allWeekDone
                    ? { background: "var(--accent)", color: "var(--accent-fg)" }
                    : { background: "var(--bg-subtle)", border: "1px solid var(--border)", color: "var(--text-muted)" }
                }
              >
                {loading ? <RefreshCw size={15} className="animate-spin" /> : <Sparkles size={15} />}
                {allWeekDone ? "Week done — plan next week" : "Plan next week"}
              </button>
            )}
            {nextWeekNote && (
              <p className="mt-2 text-center text-[13px]" style={{ color: "var(--accent)" }}>
                {nextWeekNote}
              </p>
            )}
          </>
        )}
      </div>

      {confirm ? (
        <div className="px-5 pb-5 pt-2">
          <p className="mb-2 text-[14px] text-muted">
            {confirm === "delete"
              ? "Delete this goal? This can't be undone."
              : "Replace the current plan with a new one?"}
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setConfirm(null)}
              className="ring-focus tap h-11 flex-1 rounded-2xl text-[15px] font-medium"
              style={{ background: "var(--bg-subtle)", border: "1px solid var(--border)" }}
            >
              Cancel
            </button>
            <button
              onClick={() => {
                if (confirm === "delete") onRemove(goal.id);
                else breakdown();
                setConfirm(null);
              }}
              className="ring-focus tap h-11 flex-1 rounded-2xl text-[15px] font-semibold"
              style={
                confirm === "delete"
                  ? { background: "#e5484d", color: "#fff" }
                  : { background: "var(--accent)", color: "var(--accent-fg)" }
              }
            >
              {confirm === "delete" ? "Delete" : "Replan"}
            </button>
          </div>
        </div>
      ) : (
        <div className="flex gap-2 px-5 pb-5 pt-2">
          <button
            onClick={() => setConfirm("delete")}
            className="ring-focus tap grid h-11 w-11 shrink-0 place-items-center rounded-2xl"
            style={{ background: "var(--bg-subtle)", border: "1px solid var(--border)", color: "#e5484d" }}
            aria-label="Delete goal"
          >
            <Trash2 size={17} />
          </button>
          {layers.length > 0 && (
            <button
              onClick={() => setConfirm("replan")}
              disabled={loading}
              className="ring-focus tap inline-flex h-11 flex-1 items-center justify-center gap-1.5 rounded-2xl text-[15px] font-medium"
              style={{ background: "var(--bg-subtle)", border: "1px solid var(--border)" }}
            >
              <RefreshCw size={15} className={loading ? "animate-spin" : ""} /> Replan
            </button>
          )}
        </div>
      )}
    </Overlay>
  );
}

function NumField({
  label,
  value,
  onChange,
  placeholder,
  text,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  text?: boolean;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[11px] text-faint">{label}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        inputMode={text ? undefined : "decimal"}
        className="ring-focus rounded-xl px-3 py-2 text-[15px] focus:outline-none"
        style={{ background: "var(--bg-subtle)", border: "1px solid var(--border)" }}
      />
    </label>
  );
}

function Overlay({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  return createPortal(
    <div
      className="animate-in fixed inset-0 z-[80] flex items-end justify-center sm:items-center"
      style={{ background: "rgba(0,0,0,0.5)", backdropFilter: "blur(2px)" }}
      onClick={onClose}
    >
      <div
        className="animate-sheet surface w-full max-w-lg rounded-t-3xl pb-safe sm:rounded-3xl"
        style={{ boxShadow: "var(--shadow)" }}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>,
    document.body
  );
}

