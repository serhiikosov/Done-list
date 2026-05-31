import { useMemo, useState } from "react";
import { Check, Copy, Hash } from "lucide-react";
import type { Entry } from "../types";
import {
  buildStandup,
  buildStandupText,
  type StandupScope,
  type StandupFormat,
} from "../lib/standup";
import { fullDate } from "../lib/date";

interface Props {
  entries: Entry[];
  onToggle: (id: string) => void;
}

function Block({
  label,
  date,
  items,
  accent,
  empty,
  onToggle,
}: {
  label: string;
  date: string;
  items: Entry[];
  accent: string;
  empty: string;
  onToggle: (id: string) => void;
}) {
  return (
    <div>
      <div className="mb-2 flex items-baseline gap-2">
        <h3 className="text-sm font-semibold" style={{ color: accent }}>
          {label}
        </h3>
        <span className="text-xs text-faint">{fullDate(date)}</span>
      </div>
      {items.length === 0 ? (
        <p className="px-1 text-sm text-faint italic">{empty}</p>
      ) : (
        <ul className="flex flex-col gap-1">
          {items.map((e) => (
            <li key={e.id} className="flex items-start gap-2.5">
              <button
                onClick={() => onToggle(e.id)}
                className="ring-focus mt-1 h-2 w-2 shrink-0 rounded-full transition-transform hover:scale-125"
                style={{ background: accent }}
                aria-label="Toggle status"
              />
              <span className="text-[15px] leading-snug">
                {e.text}
                {e.tag && (
                  <span className="ml-1.5 inline-flex items-center gap-0.5 align-middle text-xs text-faint">
                    <Hash size={10} />
                    {e.tag}
                  </span>
                )}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function StandupPanel({ entries, onToggle }: Props) {
  const data = useMemo(() => buildStandup(entries), [entries]);
  const [copied, setCopied] = useState<StandupScope | null>(null);
  const [format, setFormat] = useState<StandupFormat>("plain");

  const copy = async (scope: StandupScope) => {
    try {
      await navigator.clipboard.writeText(buildStandupText(data, scope, format));
      setCopied(scope);
      setTimeout(() => setCopied(null), 1600);
    } catch {
      /* clipboard blocked — ignore */
    }
  };

  return (
    <div
      className="surface animate-rise rounded-[var(--radius-card)] p-5"
      style={{ boxShadow: "var(--shadow)" }}
    >
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-[15px] font-semibold">Standup script</h2>
          <p className="text-xs text-muted">Read it top to bottom — it's how you'd say it.</p>
        </div>

        <div className="flex items-center gap-1.5">
          {/* Plain / Slack format toggle */}
          <div
            className="inline-flex rounded-md p-0.5"
            style={{ background: "var(--bg-subtle)", border: "1px solid var(--border)" }}
          >
            {(["plain", "slack"] as StandupFormat[]).map((f) => (
              <button
                key={f}
                onClick={() => setFormat(f)}
                className="ring-focus rounded px-2 py-1 text-xs font-medium capitalize transition-colors"
                style={{
                  background: format === f ? "var(--bg-elevated)" : "transparent",
                  color: format === f ? "var(--text)" : "var(--text-muted)",
                  boxShadow: format === f ? "var(--shadow)" : "none",
                }}
              >
                {f}
              </button>
            ))}
          </div>

          {/* Scoped copy buttons */}
          {(
            [
              ["all", "Copy"],
              ["yesterday", "Yest."],
              ["today", "Today"],
            ] as [StandupScope, string][]
          ).map(([scope, label]) => (
            <button
              key={scope}
              onClick={() => copy(scope)}
              className="ring-focus inline-flex items-center gap-1 rounded-md px-2 py-1.5 text-xs font-medium transition-colors"
              style={{ background: "var(--bg-subtle)", border: "1px solid var(--border)" }}
            >
              {copied === scope ? (
                <Check size={12} style={{ color: "var(--done)" }} />
              ) : (
                <Copy size={12} />
              )}
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-5">
        <Block
          label="Yesterday I"
          date={data.yesterdayKey}
          items={data.yesterdayDone}
          accent="var(--done)"
          empty="Nothing logged for the last working day."
          onToggle={onToggle}
        />
        <div style={{ borderTop: "1px solid var(--border)" }} />
        <Block
          label="Today I will"
          date={data.todayKey}
          items={data.todayPlanned}
          accent="var(--planned)"
          empty="Nothing planned yet — add a few above (switch the toggle to Planned)."
          onToggle={onToggle}
        />

        {data.todayDone.length > 0 && (
          <>
            <div style={{ borderTop: "1px solid var(--border)" }} />
            <Block
              label="Done today so far"
              date={data.todayKey}
              items={data.todayDone}
              accent="var(--done)"
              empty=""
              onToggle={onToggle}
            />
          </>
        )}

        {data.carriedOver.length > 0 && (
          <>
            <div style={{ borderTop: "1px solid var(--border)" }} />
            <div>
              <h3 className="mb-2 text-sm font-semibold text-muted">Still open</h3>
              <ul className="flex flex-col gap-1">
                {data.carriedOver.map((e) => (
                  <li key={e.id} className="flex items-start gap-2.5">
                    <button
                      onClick={() => onToggle(e.id)}
                      className="ring-focus mt-1 h-2 w-2 shrink-0 rounded-full"
                      style={{ background: "var(--text-faint)" }}
                      aria-label="Mark done"
                    />
                    <span className="text-[15px] leading-snug text-muted">{e.text}</span>
                  </li>
                ))}
              </ul>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
