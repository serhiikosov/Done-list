import { useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Copy, Check, Inbox, RotateCcw, Sparkles, Target } from "lucide-react";
import type { Entry, Goal, Grouping, GoalHorizon } from "../types";
import {
  periodStart,
  periodEnd,
  shiftPeriod,
  canGoNext,
  periodLabel,
  parseKey,
  fullDate,
  relativeDay,
} from "../lib/date";
import { EntryItem } from "./EntryItem";
import { GroupingMenu } from "./GroupingMenu";
import { ReorderList } from "./ReorderList";

interface Props {
  entries: Entry[];
  grouping: Grouping;
  onGroupingChange: (g: Grouping) => void;
  onToggle: (id: string) => void;
  onEdit: (entry: Entry) => void;
  onRemove: (id: string) => void;
  onTagClick: (tag: string) => void;
  onAIReview: (label: string, doneItems: Entry[]) => void;
  goalTitleOf?: (goalId: string) => string | undefined;
  onOpenGoal?: (goalId: string) => void;
  goals?: Goal[];
  onToggleGoalItem?: (goalId: string, item: string) => void;
  onReorder?: (orderedIds: string[]) => void;
}

const GROUPS: { id: Grouping; label: string }[] = [
  { id: "day", label: "Day" },
  { id: "week", label: "Week" },
  { id: "month", label: "Month" },
  { id: "year", label: "Year" },
];

export function PeriodView({
  entries,
  grouping,
  onGroupingChange,
  onToggle,
  onEdit,
  onRemove,
  onTagClick,
  onAIReview,
  goalTitleOf,
  onOpenGoal,
  goals,
  onToggleGoalItem,
  onReorder,
}: Props) {
  const entryGoal = (e: Entry) => {
    if (!e.goalId) return undefined;
    const title = goalTitleOf?.(e.goalId);
    if (!title) return undefined;
    return { title, onOpen: () => onOpenGoal?.(e.goalId!) };
  };
  const [cursor, setCursor] = useState<Date>(() => new Date());
  const [dx, setDx] = useState(0);
  const [animating, setAnimating] = useState(false);
  const [copied, setCopied] = useState(false);
  const drag = useRef<{ x: number; y: number; dir: "none" | "h" | "v" } | null>(null);

  const start = periodStart(cursor, grouping);
  const end = periodEnd(cursor, grouping);
  const label = periodLabel(cursor, grouping);
  const nextAllowed = canGoNext(cursor, grouping);

  const items = useMemo(
    () =>
      entries
        .filter((e) => {
          const d = parseKey(e.date);
          return d >= start && d <= end;
        })
        .sort((a, b) => {
          // Manual drag order wins in the day view.
          if (grouping === "day") {
            const ao = a.order ?? Infinity;
            const bo = b.order ?? Infinity;
            if (ao !== bo) return ao - bo;
          }
          if (a.status !== b.status) return a.status === "planned" ? -1 : 1;
          if (a.date !== b.date) return b.date.localeCompare(a.date);
          return b.createdAt - a.createdAt;
        }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [entries, grouping, start.getTime(), end.getTime()]
  );

  const doneCount = items.filter((e) => e.status === "done").length;
  const plannedCount = items.length - doneCount;

  // Group by day for week/month/year.
  const dayGroups = useMemo(() => {
    if (grouping === "day") return null;
    const map = new Map<string, Entry[]>();
    for (const e of items) {
      const arr = map.get(e.date) ?? [];
      arr.push(e);
      map.set(e.date, arr);
    }
    return [...map.entries()].sort((a, b) => b[0].localeCompare(a[0]));
  }, [items, grouping]);

  // Auto-surface goal items for the matching horizon, but only in the
  // current period (these items aren't tied to a specific past/future period).
  const goalHorizon: GoalHorizon | null =
    grouping === "week" ? "week" : grouping === "month" ? "month" : grouping === "year" ? "1-year" : null;
  const entryGoalKeys = new Set(items.filter((e) => e.goalId).map((e) => `${e.goalId}|${e.text}`));
  const goalSections =
    goalHorizon && !nextAllowed && goals
      ? goals
          .map((g) => {
            const layer = g.layers.find((l) => l.horizon === goalHorizon);
            if (!layer) return null;
            const visible = layer.items.filter((it) => !entryGoalKeys.has(`${g.id}|${it}`));
            if (visible.length === 0) return null;
            const stale =
              goalHorizon === "week" &&
              g.weekPlannedAt != null &&
              Date.now() - g.weekPlannedAt > 7 * 86400000 &&
              layer.items.some((it) => !(g.done?.includes(it)));
            return { goal: g, items: visible, stale };
          })
          .filter((x): x is { goal: Goal; items: string[]; stale: boolean } => x !== null)
      : [];

  const go = (dir: 1 | -1) => {
    if (dir === 1 && !nextAllowed) return;
    setAnimating(true);
    setDx(0);
    setCursor((c) => shiftPeriod(c, grouping, dir));
  };

  const nowTitle = periodLabel(new Date(), grouping).title;
  const jumpToNow = () => {
    setAnimating(true);
    setDx(0);
    setCursor(new Date());
  };

  const copyRecap = async () => {
    const done = items.filter((e) => e.status === "done");
    const lines = [`Shipped — ${label.title}${label.subtitle ? ` (${label.subtitle})` : ""}`];
    for (const e of done) lines.push(`• ${e.text}${e.tag ? `  (${e.tag})` : ""}`);
    if (done.length === 0) lines.push("• (nothing yet)");
    try {
      await navigator.clipboard.writeText(lines.join("\n"));
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* ignore */
    }
  };

  // ── Horizontal swipe to change period ────────────────────────────
  const onDown = (e: React.PointerEvent) => {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    drag.current = { x: e.clientX, y: e.clientY, dir: "none" };
    setAnimating(false);
  };
  const onMove = (e: React.PointerEvent) => {
    if (!drag.current) return;
    const ddx = e.clientX - drag.current.x;
    const ddy = e.clientY - drag.current.y;
    if (drag.current.dir === "none") {
      if (Math.abs(ddx) < 8 && Math.abs(ddy) < 8) return;
      drag.current.dir = Math.abs(ddx) > Math.abs(ddy) ? "h" : "v";
      if (drag.current.dir === "h") (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    }
    if (drag.current.dir !== "h") return;
    let nx = ddx;
    if (nx < 0 && !nextAllowed) nx = Math.max(nx, -48); // resist into the future
    setDx(Math.max(-200, Math.min(200, nx)));
  };
  const onUp = () => {
    const d = drag.current;
    drag.current = null;
    if (d && d.dir === "h") {
      if (dx > 70) go(-1);
      else if (dx < -70 && nextAllowed) go(1);
      else {
        setAnimating(true);
        setDx(0);
      }
    } else {
      setDx(0);
    }
  };

  return (
    <div className="animate-in">
      {/* Period navigator */}
      <div className="mb-5 flex items-end justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-[30px] font-bold leading-tight tracking-tight">{label.title}</h1>
          {label.subtitle && <p className="mt-0.5 text-[15px] text-muted">{label.subtitle}</p>}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <GroupingMenu value={grouping} options={GROUPS} onChange={(id) => onGroupingChange(id as Grouping)} />
          <div className="flex items-center gap-1">
            <NavBtn onClick={() => go(-1)} aria="Previous">
              <ChevronLeft size={20} />
            </NavBtn>
            <NavBtn onClick={() => go(1)} aria="Next" disabled={!nextAllowed}>
              <ChevronRight size={20} />
            </NavBtn>
          </div>
        </div>
      </div>

      {/* Back to current period */}
      {nextAllowed && (
        <div className="mb-4 flex justify-center">
          <button
            onClick={jumpToNow}
            className="ring-focus tap inline-flex h-9 items-center gap-1.5 rounded-full px-4 text-[13px] font-semibold"
            style={{ background: "var(--accent-soft)", color: "var(--accent)" }}
          >
            <RotateCcw size={14} /> Back to {nowTitle.toLowerCase()}
          </button>
        </div>
      )}

      {/* Count line + recap (static) */}
      <div className="mb-5 flex items-center justify-between">
        <div className="flex items-center gap-2 text-[15px]">
          <span className="font-semibold tabular-nums" style={{ color: "var(--done)" }}>
            {doneCount}
          </span>
          <span className="text-muted">done</span>
          <span className="text-faint">·</span>
          <span className="font-semibold tabular-nums" style={{ color: "var(--planned)" }}>
            {plannedCount}
          </span>
          <span className="text-muted">planned</span>
        </div>
        {doneCount > 0 && (
          <div className="flex items-center gap-2">
            <button
              onClick={() =>
                onAIReview(
                  `${label.title}${label.subtitle ? ` (${label.subtitle})` : ""}`,
                  items.filter((e) => e.status === "done")
                )
              }
              className="ring-focus tap inline-flex h-9 items-center gap-1.5 rounded-full px-3.5 text-[13px] font-semibold text-[var(--accent-fg)]"
              style={{ background: "var(--accent)" }}
            >
              <Sparkles size={14} /> AI review
            </button>
            <button
              onClick={copyRecap}
              aria-label="Copy recap"
              className="ring-focus tap grid h-9 w-9 place-items-center rounded-full text-muted"
              style={{ background: "var(--bg-subtle)", border: "1px solid var(--border)" }}
            >
              {copied ? <Check size={15} style={{ color: "var(--done)" }} /> : <Copy size={15} />}
            </button>
          </div>
        )}
      </div>

      {/* Swipeable period content — fills the screen so you can swipe anywhere */}
      <div
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={onUp}
        className="min-h-[58vh]"
        style={{ touchAction: "pan-y" }}
      >
        <div
          style={{
            transform: `translateX(${dx}px)`,
            transition: animating ? "transform 0.24s cubic-bezier(0.2,0.7,0.2,1)" : "none",
          }}
        >
        {/* Auto-surfaced goal items for this horizon */}
        {goalSections.length > 0 && (
          <div className="mb-6 flex flex-col gap-4">
            <div className="px-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-faint">
              From your goals
            </div>
            {goalSections.map(({ goal, items: gItems, stale }) => (
              <section key={goal.id}>
                <button
                  onClick={() => onOpenGoal?.(goal.id)}
                  className="ring-focus mb-2 flex items-center gap-1.5 px-1 text-[14px] font-semibold"
                  style={{ color: "var(--accent)" }}
                >
                  <Target size={14} />
                  <span className="truncate">{goal.title}</span>
                  <ChevronRight size={14} className="text-faint" />
                </button>
                {stale && (
                  <button
                    onClick={() => onOpenGoal?.(goal.id)}
                    className="ring-focus mb-2 block w-full rounded-xl px-3 py-2 text-left text-[12px]"
                    style={{ background: "var(--planned-soft)", color: "var(--planned)" }}
                  >
                    This week's plan is over a week old — tap to plan next week.
                  </button>
                )}
                <div
                  className="overflow-hidden rounded-2xl"
                  style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)" }}
                >
                  {gItems.map((it, i) => {
                    const isDone = goal.done?.includes(it) ?? false;
                    return (
                      <div
                        key={it}
                        className="flex items-center gap-3 px-4 py-3"
                        style={i > 0 ? { borderTop: "1px solid var(--border)" } : undefined}
                      >
                        <button
                          onClick={() => onToggleGoalItem?.(goal.id, it)}
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
                          style={isDone ? { color: "var(--text-faint)", textDecoration: "line-through" } : undefined}
                        >
                          {it}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </section>
            ))}
          </div>
        )}

        {items.length === 0 && goalSections.length === 0 ? (
          <div className="mt-10 flex flex-col items-center text-center">
            <span
              className="grid h-12 w-12 place-items-center rounded-full"
              style={{ background: "var(--bg-subtle)" }}
            >
              <Inbox size={22} className="text-faint" />
            </span>
            <p className="mt-4 text-[15px] font-medium">Nothing for {label.title.toLowerCase()}</p>
            <p className="mt-1 text-sm text-muted">Swipe to move between periods.</p>
          </div>
        ) : items.length === 0 ? null : dayGroups ? (
          <div className="flex flex-col gap-6">
            {dayGroups.map(([day, dayItems]) => (
              <section key={day}>
                <div className="mb-2 px-1 text-[13px] font-semibold text-muted">
                  {relativeDay(day)}
                  <span className="ml-2 font-normal text-faint">{fullDate(day).replace(/,\s*\d{4}$/, "")}</span>
                </div>
                <Card>
                  {dayItems.map((e, i) => (
                    <Row key={e.id} divider={i > 0}>
                      <EntryItem entry={e} onToggle={onToggle} onEdit={onEdit} onRemove={onRemove} onTagClick={onTagClick} goal={entryGoal(e)} />
                    </Row>
                  ))}
                </Card>
              </section>
            ))}
          </div>
        ) : (
          <Card>
            <ReorderList
              rows={items.map((e) => ({
                id: e.id,
                node: (
                  <EntryItem
                    entry={e}
                    onToggle={onToggle}
                    onEdit={onEdit}
                    onRemove={onRemove}
                    onTagClick={onTagClick}
                    goal={entryGoal(e)}
                  />
                ),
              }))}
              onReorder={(ids) => onReorder?.(ids)}
            />
          </Card>
        )}
        </div>
      </div>
    </div>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="overflow-hidden rounded-2xl"
      style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)" }}
    >
      {children}
    </div>
  );
}

function Row({ children, divider }: { children: React.ReactNode; divider: boolean }) {
  return <div style={divider ? { borderTop: "1px solid var(--border)" } : undefined}>{children}</div>;
}

function NavBtn({
  children,
  onClick,
  aria,
  disabled,
}: {
  children: React.ReactNode;
  onClick: () => void;
  aria: string;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label={aria}
      className="ring-focus tap grid h-10 w-10 place-items-center rounded-full text-muted transition-opacity disabled:opacity-30"
      style={{ background: "var(--bg-subtle)", border: "1px solid var(--border)" }}
    >
      {children}
    </button>
  );
}
