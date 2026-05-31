import { useMemo, useState } from "react";
import { Check, Copy, Hash } from "lucide-react";
import type { Entry } from "../types";
import { buildStandup, standupToText } from "../lib/standup";
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
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(standupToText(data));
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      /* clipboard blocked — ignore */
    }
  };

  return (
    <div
      className="surface animate-rise rounded-[var(--radius-card)] p-5"
      style={{ boxShadow: "var(--shadow)" }}
    >
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-[15px] font-semibold">Standup script</h2>
          <p className="text-xs text-muted">Read it top to bottom — it's how you'd say it.</p>
        </div>
        <button
          onClick={copy}
          className="ring-focus inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors"
          style={{ background: "var(--bg-subtle)", border: "1px solid var(--border)" }}
        >
          {copied ? (
            <>
              <Check size={13} style={{ color: "var(--done)" }} /> Copied
            </>
          ) : (
            <>
              <Copy size={13} /> Copy
            </>
          )}
        </button>
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
          empty="Nothing planned yet — add a few things above."
          onToggle={onToggle}
        />

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
