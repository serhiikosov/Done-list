import { useMemo, useState } from "react";
import { Check, Copy, Hash, Share, X, Plus, Trash2 } from "lucide-react";
import type { Entry } from "../types";
import {
  buildStandup,
  buildStandupText,
  type StandupScope,
  type StandupFormat,
} from "../lib/standup";
import { fullDate } from "../lib/date";
import { tagColor } from "../lib/tags";
import { SwipeRow } from "./SwipeRow";
import { useScrollLock } from "../hooks/useScrollLock";

interface Props {
  entries: Entry[];
  onToggle: (id: string) => void;
  onEdit: (entry: Entry) => void;
  onRemove: (id: string) => void;
  onCapture: () => void;
}

export function StandupPanel({ entries, onToggle, onEdit, onRemove, onCapture }: Props) {
  const data = useMemo(() => buildStandup(entries), [entries]);
  const [shareOpen, setShareOpen] = useState(false);

  const nothingYet =
    data.yesterdayDone.length === 0 &&
    data.todayPlanned.length === 0 &&
    data.todayDone.length === 0 &&
    data.carriedOver.length === 0;

  return (
    <div className="animate-in">
      {/* Hero */}
      <div className="mb-7 flex items-start justify-between gap-3">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-faint">
            Standup
          </div>
          <h1 className="mt-1 text-[30px] font-bold leading-tight tracking-tight">
            {heroTitle(data.todayKey)}
          </h1>
          <p className="mt-1.5 text-[15px] text-muted">Read it top to bottom — it's how you'd say it.</p>
        </div>
        <button
          onClick={() => setShareOpen(true)}
          className="ring-focus tap mt-1 inline-flex h-10 shrink-0 items-center gap-1.5 rounded-full px-4 text-[15px] font-medium"
          style={{ background: "var(--bg-subtle)", border: "1px solid var(--border)" }}
        >
          <Share size={17} /> Share
        </button>
      </div>

      {nothingYet ? (
        <EmptyStandup onCapture={onCapture} />
      ) : (
        <div className="flex flex-col gap-8">
          <Section
            eyebrow="Yesterday I"
            date={data.yesterdayKey}
            color="var(--done)"
            items={data.yesterdayDone}
            empty="Nothing logged for your last working day."
            onToggle={onToggle}
            onEdit={onEdit}
            onRemove={onRemove}
          />
          <Section
            eyebrow="Today I will"
            date={data.todayKey}
            color="var(--planned)"
            items={data.todayPlanned}
            empty="No plans yet — tap ＋ to add one."
            onToggle={onToggle}
            onEdit={onEdit}
            onRemove={onRemove}
          />
          {data.todayDone.length > 0 && (
            <Section
              eyebrow="Done today so far"
              date={data.todayKey}
              color="var(--done)"
              items={data.todayDone}
              onToggle={onToggle}
              onEdit={onEdit}
              onRemove={onRemove}
            />
          )}
          {data.carriedOver.length > 0 && (
            <Section
              eyebrow="Still open"
              color="var(--text-faint)"
              items={data.carriedOver}
              muted
              onToggle={onToggle}
              onEdit={onEdit}
              onRemove={onRemove}
            />
          )}
        </div>
      )}

      {shareOpen && <ShareSheet data={data} onClose={() => setShareOpen(false)} />}
    </div>
  );
}

function heroTitle(key: string): string {
  // "Monday, June 1" — the full date without the year for a calmer hero.
  return fullDate(key).replace(/,\s*\d{4}$/, "");
}

function Section({
  eyebrow,
  date,
  color,
  items,
  empty,
  muted,
  onToggle,
  onEdit,
  onRemove,
}: {
  eyebrow: string;
  date?: string;
  color: string;
  items: Entry[];
  empty?: string;
  muted?: boolean;
  onToggle: (id: string) => void;
  onEdit: (entry: Entry) => void;
  onRemove: (id: string) => void;
}) {
  return (
    <section>
      <div className="mb-2.5 flex items-baseline gap-2">
        <h2 className="text-[16px] font-semibold" style={{ color }}>
          {eyebrow}
        </h2>
        {date && <span className="text-[13px] text-faint">{fullDate(date)}</span>}
      </div>
      {items.length === 0 ? (
        <p className="px-1 text-[15px] italic text-faint">{empty}</p>
      ) : (
        <ul className="flex flex-col">
          {items.map((e) => {
            const tc = e.tag ? tagColor(e.tag) : null;
            return (
              <li key={e.id}>
                <SwipeRow
                  leftAction={{ icon: <Check size={20} strokeWidth={3} />, bg: "var(--done)" }}
                  onSwipeRight={() => onToggle(e.id)}
                  rightAction={{ icon: <Trash2 size={20} />, bg: "#e5484d" }}
                  onSwipeLeft={() => onRemove(e.id)}
                >
                  <div className="flex items-start gap-3 py-1.5">
                    <button
                      onClick={() => onToggle(e.id)}
                      className="ring-focus tap mt-[9px] h-2.5 w-2.5 shrink-0 rounded-full"
                      style={{ background: color }}
                      aria-label="Toggle status"
                    />
                    <button
                      onClick={() => onEdit(e)}
                      className="ring-focus min-w-0 flex-1 text-left text-[17px] leading-snug"
                      style={{ color: muted ? "var(--text-muted)" : "var(--text)" }}
                    >
                      {e.text}
                      {e.tag && tc && (
                        <span
                          className="ml-1.5 inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 align-middle text-[11px] font-medium"
                          style={{ background: tc.soft, color: tc.color }}
                        >
                          <Hash size={10} />
                          {e.tag}
                        </span>
                      )}
                    </button>
                  </div>
                </SwipeRow>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

function EmptyStandup({ onCapture }: { onCapture: () => void }) {
  return (
    <div className="mt-10 flex flex-col items-center text-center">
      <div
        className="grid h-14 w-14 place-items-center rounded-2xl"
        style={{ background: "var(--accent-soft)", color: "var(--accent)" }}
      >
        <Check size={26} strokeWidth={2.5} />
      </div>
      <h3 className="mt-4 text-lg font-semibold">Log your first win</h3>
      <p className="mt-1 max-w-xs text-sm text-muted">
        Capture what you shipped. Tomorrow it becomes your “yesterday”, and your standup writes
        itself.
      </p>
      <button
        onClick={onCapture}
        className="ring-focus tap mt-5 inline-flex h-11 items-center gap-1.5 rounded-full px-5 text-sm font-semibold text-[var(--accent-fg)]"
        style={{ background: "var(--accent)" }}
      >
        <Plus size={17} strokeWidth={2.6} /> Add what you did
      </button>
    </div>
  );
}

function ShareSheet({
  data,
  onClose,
}: {
  data: ReturnType<typeof buildStandup>;
  onClose: () => void;
}) {
  const [format, setFormat] = useState<StandupFormat>("plain");
  const [copied, setCopied] = useState<StandupScope | null>(null);
  useScrollLock(true);

  const copy = async (scope: StandupScope) => {
    try {
      await navigator.clipboard.writeText(buildStandupText(data, scope, format));
      setCopied(scope);
      setTimeout(() => setCopied(null), 1500);
    } catch {
      /* ignore */
    }
  };

  return (
    <div
      className="animate-in fixed inset-0 z-[60] flex items-end justify-center sm:items-center"
      style={{ background: "rgba(0,0,0,0.5)", backdropFilter: "blur(2px)" }}
      onClick={onClose}
    >
      <div
        className="animate-sheet surface w-full max-w-md rounded-t-3xl pb-safe sm:rounded-3xl"
        style={{ boxShadow: "var(--shadow)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 pb-1 pt-4">
          <h3 className="text-base font-semibold">Share standup</h3>
          <button
            onClick={onClose}
            className="ring-focus tap grid h-8 w-8 place-items-center rounded-full text-muted"
            style={{ background: "var(--bg-subtle)" }}
            aria-label="Close"
          >
            <X size={15} />
          </button>
        </div>

        <div className="flex flex-col gap-3 px-5 pb-6 pt-3">
          {/* Format */}
          <div
            className="inline-flex w-full rounded-xl p-0.5"
            style={{ background: "var(--bg-subtle)", border: "1px solid var(--border)" }}
          >
            {(["plain", "slack"] as StandupFormat[]).map((f) => (
              <button
                key={f}
                onClick={() => setFormat(f)}
                className="ring-focus tap flex-1 rounded-lg py-1.5 text-sm font-medium capitalize"
                style={{
                  background: format === f ? "var(--bg-elevated)" : "transparent",
                  color: format === f ? "var(--text)" : "var(--text-muted)",
                  boxShadow: format === f ? "var(--shadow)" : "none",
                }}
              >
                {f === "plain" ? "Plain text" : "Slack"}
              </button>
            ))}
          </div>

          {/* Copy options */}
          {(
            [
              ["all", "Copy full script"],
              ["yesterday", "Copy yesterday only"],
              ["today", "Copy today only"],
            ] as [StandupScope, string][]
          ).map(([scope, label]) => (
            <button
              key={scope}
              onClick={() => copy(scope)}
              className="ring-focus tap flex h-11 items-center justify-between rounded-xl px-4 text-[15px] font-medium"
              style={{ background: "var(--bg-subtle)", border: "1px solid var(--border)" }}
            >
              {label}
              {copied === scope ? (
                <Check size={16} style={{ color: "var(--done)" }} />
              ) : (
                <Copy size={15} className="text-faint" />
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
