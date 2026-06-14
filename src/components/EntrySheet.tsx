import { useEffect, useRef, useState } from "react";
import { Check, ArrowRight, Hash, CalendarDays, X, Target, ChevronRight, Link2 } from "lucide-react";
import type { Entry, EntryStatus, Goal, GoalHorizon } from "../types";
import { todayKey, yesterdayKey, relativeDay } from "../lib/date";
import { tagColor } from "../lib/tags";
import { useScrollLock } from "../hooks/useScrollLock";

interface Props {
  entry: Entry | null;
  goals: Goal[];
  progressOf: (g: Goal) => number;
  onOpenGoal: (id: string) => void;
  onClose: () => void;
  onUpdate: (id: string, patch: Partial<Entry>) => void;
  onRemove: (id: string) => void;
  recentTags: string[];
}

const H_SHORT: Record<GoalHorizon, string> = {
  "3-year": "3y",
  "1-year": "1y",
  quarter: "Quarter",
  month: "Month",
  week: "Week",
};

export function EntrySheet({
  entry,
  goals,
  progressOf,
  onOpenGoal,
  onClose,
  onUpdate,
  onRemove,
  recentTags,
}: Props) {
  const [text, setText] = useState("");
  const [status, setStatus] = useState<EntryStatus>("done");
  const [date, setDate] = useState(todayKey());
  const [tag, setTag] = useState<string | undefined>(undefined);
  const [goalId, setGoalId] = useState<string | undefined>(undefined);
  const [linking, setLinking] = useState(false);
  const taRef = useRef<HTMLTextAreaElement>(null);
  const dateRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (entry) {
      setText(entry.text);
      setStatus(entry.status);
      setDate(entry.date);
      setTag(entry.tag);
      setGoalId(entry.goalId);
      setLinking(false);
    }
  }, [entry]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    if (entry) window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [entry, onClose]);

  useEffect(() => {
    if (entry && taRef.current) {
      const el = taRef.current;
      el.style.height = "auto";
      el.style.height = Math.min(el.scrollHeight, 160) + "px";
    }
  }, [entry]);

  useScrollLock(!!entry);

  if (!entry) return null;

  const save = () => {
    const t = text.trim();
    if (!t) return;
    onUpdate(entry.id, { text: t, status, date, tag: tag || undefined, goalId: goalId });
    onClose();
  };

  const openDatePicker = () => {
    const el = dateRef.current;
    if (!el) return;
    if (typeof el.showPicker === "function") el.showPicker();
    else el.focus();
  };

  const customDate = date !== todayKey() && date !== yesterdayKey();
  const tagSuggestions = recentTags.filter((t) => t !== tag).slice(0, 6);
  const linkedGoal = goals.find((g) => g.id === goalId);

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
        {/* Header: Cancel · title · Save (keyboard-safe) */}
        <div className="flex items-center justify-between px-4 pt-4">
          <button onClick={onClose} className="ring-focus tap px-1 text-[15px] text-muted">
            Cancel
          </button>
          <span className="text-[15px] font-semibold">Edit</span>
          <button
            onClick={save}
            disabled={!text.trim()}
            className="ring-focus tap px-1 text-[15px] font-semibold disabled:opacity-40"
            style={{ color: "var(--accent)" }}
          >
            Save
          </button>
        </div>

        <div className="flex max-h-[72vh] flex-col gap-4 overflow-y-auto px-5 pb-5 pt-4">
          <div className="grid grid-cols-2 gap-2">
            <StatusCard active={status === "done"} onClick={() => setStatus("done")} icon={<Check size={16} strokeWidth={3} />} title="Done" color="var(--done)" soft="var(--done-soft)" />
            <StatusCard active={status === "planned"} onClick={() => setStatus("planned")} icon={<ArrowRight size={16} strokeWidth={2.6} />} title="Planned" color="var(--planned)" soft="var(--planned-soft)" />
          </div>

          <textarea
            ref={taRef}
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              e.target.style.height = "auto";
              e.target.style.height = Math.min(e.target.scrollHeight, 160) + "px";
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                save();
              }
            }}
            rows={2}
            className="ring-focus w-full resize-none rounded-2xl px-4 py-3 text-[17px] leading-snug focus:outline-none"
            style={{ background: "var(--bg-subtle)", border: "1px solid var(--border)" }}
          />

          {/* Part of — the goal/roadmap this task belongs to */}
          <div>
            <div className="mb-2 text-xs font-medium uppercase tracking-wider text-faint">Part of</div>
            {linkedGoal ? (
              <div
                className="rounded-2xl p-3"
                style={{ background: "var(--bg-subtle)", border: "1px solid var(--border)" }}
              >
                <div className="flex items-center gap-2.5">
                  <span
                    className="grid h-8 w-8 shrink-0 place-items-center rounded-xl"
                    style={{ background: "var(--accent-soft)", color: "var(--accent)" }}
                  >
                    <Target size={16} />
                  </span>
                  <button
                    onClick={() => {
                      onOpenGoal(linkedGoal.id);
                      onClose();
                    }}
                    className="ring-focus flex min-w-0 flex-1 items-center gap-1 text-left"
                  >
                    <span className="min-w-0 flex-1 truncate text-[15px] font-semibold">
                      {linkedGoal.title}
                    </span>
                    <ChevronRight size={16} className="shrink-0 text-faint" />
                  </button>
                  <button
                    onClick={() => setGoalId(undefined)}
                    className="ring-focus tap text-[12px] text-faint"
                  >
                    Unlink
                  </button>
                </div>
                {/* progress */}
                <div className="mt-2.5 flex items-center gap-2">
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full" style={{ background: "var(--bg-elevated)" }}>
                    <div className="h-full rounded-full" style={{ width: `${progressOf(linkedGoal)}%`, background: "var(--done)" }} />
                  </div>
                  <span className="text-[12px] tabular-nums text-faint">{progressOf(linkedGoal)}%</span>
                </div>
                {/* roadmap breadcrumb */}
                {linkedGoal.layers.length > 0 && (
                  <div className="mt-2.5 flex flex-wrap items-center gap-1 text-[12px]">
                    {linkedGoal.layers.map((l, i) => (
                      <span key={l.horizon} className="flex items-center gap-1">
                        {i > 0 && <ChevronRight size={11} className="text-faint" />}
                        <span
                          className="rounded-md px-1.5 py-0.5"
                          style={
                            l.horizon === "week"
                              ? { background: "var(--accent-soft)", color: "var(--accent)", fontWeight: 600 }
                              : { color: "var(--text-faint)" }
                          }
                        >
                          {H_SHORT[l.horizon]}
                        </span>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ) : goals.length === 0 ? (
              <p className="text-[13px] text-faint">No goals yet — create one in the Goals tab.</p>
            ) : linking ? (
              <div className="flex flex-col gap-1.5">
                {goals.map((g) => (
                  <button
                    key={g.id}
                    onClick={() => {
                      setGoalId(g.id);
                      setLinking(false);
                    }}
                    className="ring-focus tap flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-left"
                    style={{ background: "var(--bg-subtle)", border: "1px solid var(--border)" }}
                  >
                    <Target size={15} style={{ color: "var(--accent)" }} />
                    <span className="min-w-0 flex-1 truncate text-[15px]">{g.title}</span>
                  </button>
                ))}
                <button onClick={() => setLinking(false)} className="ring-focus tap mt-1 text-[13px] text-faint">
                  Cancel
                </button>
              </div>
            ) : (
              <button
                onClick={() => setLinking(true)}
                className="ring-focus tap inline-flex items-center gap-1.5 rounded-xl px-3 py-2.5 text-[15px] text-muted"
                style={{ background: "var(--bg-subtle)", border: "1px solid var(--border)" }}
              >
                <Link2 size={15} /> Link to a goal
              </button>
            )}
          </div>

          {/* When */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium uppercase tracking-wider text-faint">When</span>
            <div className="flex items-center gap-1.5">
              <Chip active={date === todayKey()} onClick={() => setDate(todayKey())}>Today</Chip>
              <Chip active={date === yesterdayKey()} onClick={() => setDate(yesterdayKey())}>Yesterday</Chip>
              <Chip active={customDate} onClick={openDatePicker}>
                <CalendarDays size={12} />
                {customDate ? relativeDay(date) : "Pick"}
              </Chip>
            </div>
            <input
              ref={dateRef}
              type="date"
              value={date}
              max={todayKey()}
              onChange={(e) => e.target.value && setDate(e.target.value)}
              className="pointer-events-none absolute h-0 w-0 opacity-0"
              tabIndex={-1}
              aria-hidden
            />
          </div>

          {/* Tag */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs font-medium uppercase tracking-wider text-faint">Tag</span>
            {tag && (
              <button
                onClick={() => setTag(undefined)}
                className="ring-focus tap inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium"
                style={{ background: tagColor(tag).soft, color: tagColor(tag).color }}
              >
                <Hash size={11} />
                {tag}
                <X size={11} />
              </button>
            )}
            {tagSuggestions.map((t) => (
              <button
                key={t}
                onClick={() => setTag(t)}
                className="ring-focus tap inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs text-muted"
                style={{ background: "var(--bg-subtle)", border: "1px solid var(--border)" }}
              >
                <Hash size={11} />
                {t}
              </button>
            ))}
          </div>

          <button
            onClick={() => {
              onRemove(entry.id);
              onClose();
            }}
            className="ring-focus tap mt-1 h-11 rounded-2xl text-[15px] font-medium"
            style={{ background: "var(--bg-subtle)", border: "1px solid var(--border)", color: "#e5484d" }}
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

function StatusCard({ active, onClick, icon, title, color, soft }: { active: boolean; onClick: () => void; icon: React.ReactNode; title: string; color: string; soft: string }) {
  return (
    <button
      onClick={onClick}
      className="ring-focus tap flex items-center gap-2.5 rounded-2xl px-3 py-2.5 text-left transition-all"
      style={{ background: active ? soft : "var(--bg-subtle)", border: `1.5px solid ${active ? color : "var(--border)"}` }}
    >
      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full" style={{ background: active ? color : "var(--bg-elevated)", color: active ? "#fff" : "var(--text-faint)" }}>
        {icon}
      </span>
      <span className="text-sm font-semibold" style={{ color: active ? color : "var(--text)" }}>{title}</span>
    </button>
  );
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className="ring-focus tap inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium transition-colors"
      style={{ background: active ? "var(--accent-soft)" : "var(--bg-subtle)", color: active ? "var(--accent)" : "var(--text-muted)", border: `1px solid ${active ? "transparent" : "var(--border)"}` }}
    >
      {children}
    </button>
  );
}
