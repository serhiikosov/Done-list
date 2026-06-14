import { useEffect, useRef, useState } from "react";
import { Plus, X, Sparkles, RefreshCw, Trash2, Target, Check, ChevronRight } from "lucide-react";
import type { Goal, GoalHorizon } from "../types";
import { aiBreakdownGoal } from "../lib/ai";
import { useScrollLock } from "../hooks/useScrollLock";
import type { NewGoal } from "../hooks/useGoals";

interface Props {
  goals: Goal[];
  onAdd: (g: NewGoal) => Goal;
  onUpdate: (id: string, patch: Partial<Goal>) => void;
  onRemove: (id: string) => void;
  onAddAction: (goal: Goal, action: string) => void;
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

export function GoalsView({ goals, onAdd, onUpdate, onRemove, onAddAction, onOpenSettings }: Props) {
  const [composerOpen, setComposerOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = goals.find((g) => g.id === selectedId) ?? null;

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
                </span>
                <ChevronRight size={18} className="text-faint" />
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
            setSelectedId(created.id);
          }}
        />
      )}

      {selected && (
        <GoalDetailSheet
          goal={selected}
          otherGoals={goals.filter((g) => g.id !== selected.id)}
          onClose={() => setSelectedId(null)}
          onUpdate={onUpdate}
          onRemove={(id) => {
            onRemove(id);
            setSelectedId(null);
          }}
          onAddAction={onAddAction}
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
  const ref = useRef<HTMLInputElement>(null);
  useScrollLock(true);
  useEffect(() => {
    const t = setTimeout(() => ref.current?.focus(), 120);
    return () => clearTimeout(t);
  }, []);

  const submit = () => title.trim() && onSave({ title, detail, horizon, auto });

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
      </div>
    </Overlay>
  );
}

function GoalDetailSheet({
  goal,
  otherGoals,
  onClose,
  onUpdate,
  onRemove,
  onAddAction,
  onOpenSettings,
}: {
  goal: Goal;
  otherGoals: Goal[];
  onClose: () => void;
  onUpdate: (id: string, patch: Partial<Goal>) => void;
  onRemove: (id: string) => void;
  onAddAction: (goal: Goal, action: string) => void;
  onOpenSettings: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [picked, setPicked] = useState<GoalHorizon | null>(null);
  useScrollLock(true);

  const layers = goal.layers;
  const activeHorizon =
    picked && layers.some((l) => l.horizon === picked)
      ? picked
      : layers[layers.length - 1]?.horizon;
  const activeLayer = layers.find((l) => l.horizon === activeHorizon);

  const breakdown = async () => {
    setLoading(true);
    setError(null);
    try {
      const r = await aiBreakdownGoal(
        goal,
        otherGoals.map((g) => ({ title: g.title, horizon: g.horizon }))
      );
      onUpdate(goal.id, {
        summary: r.summary,
        layers: r.layers,
        horizon: r.horizon ?? goal.horizon,
        auto: false,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  };

  const needsKey = error?.includes("API key");

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
                  onClick={needsKey ? onOpenSettings : breakdown}
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

            {activeLayer?.label && (
              <p className="mb-3 text-[15px] font-medium" style={{ color: "var(--accent)" }}>
                {activeLayer.label}
              </p>
            )}

            <div
              className="overflow-hidden rounded-2xl"
              style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)" }}
            >
              {activeLayer?.items.map((item, i) => {
                const isWeek = activeHorizon === "week";
                const isAdded = goal.added?.includes(item) ?? false;
                return (
                  <div
                    key={`${activeHorizon}-${i}`}
                    className="flex items-start gap-3 px-4 py-3"
                    style={i > 0 ? { borderTop: "1px solid var(--border)" } : undefined}
                  >
                    <span
                      className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full"
                      style={{ background: "var(--text-faint)" }}
                    />
                    <span className="min-w-0 flex-1 text-[16px] leading-snug">{item}</span>
                    {isWeek && (
                      <button
                        onClick={() => {
                          if (isAdded) return;
                          onAddAction(goal, item);
                          onUpdate(goal.id, { added: [...(goal.added ?? []), item] });
                        }}
                        disabled={isAdded}
                        className="ring-focus tap inline-flex h-8 shrink-0 items-center gap-1 rounded-full px-2.5 text-[12px] font-medium"
                        style={{
                          background: isAdded ? "var(--done-soft)" : "var(--accent-soft)",
                          color: isAdded ? "var(--done)" : "var(--accent)",
                        }}
                      >
                        {isAdded ? <Check size={13} /> : <Plus size={13} />}
                        {isAdded ? "Added" : "Today"}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      <div className="flex gap-2 px-5 pb-5 pt-2">
        <button
          onClick={() => onRemove(goal.id)}
          className="ring-focus tap grid h-11 w-11 shrink-0 place-items-center rounded-2xl"
          style={{ background: "var(--bg-subtle)", border: "1px solid var(--border)", color: "#e5484d" }}
          aria-label="Delete goal"
        >
          <Trash2 size={17} />
        </button>
        {layers.length > 0 && (
          <button
            onClick={breakdown}
            disabled={loading}
            className="ring-focus tap inline-flex h-11 flex-1 items-center justify-center gap-1.5 rounded-2xl text-[15px] font-medium"
            style={{ background: "var(--bg-subtle)", border: "1px solid var(--border)" }}
          >
            <RefreshCw size={15} className={loading ? "animate-spin" : ""} /> Replan
          </button>
        )}
      </div>
    </Overlay>
  );
}

function Overlay({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  return (
    <div
      className="animate-in fixed inset-0 z-[60] flex items-end justify-center sm:items-center"
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
    </div>
  );
}

