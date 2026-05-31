import { forwardRef, useRef, useState } from "react";
import { CornerDownLeft, Hash, CalendarDays } from "lucide-react";
import type { EntryStatus } from "../types";
import { StatusToggle } from "./StatusToggle";
import type { NewEntryInput } from "../hooks/useEntries";
import { todayKey, yesterdayKey, relativeDay } from "../lib/date";

interface Props {
  onAdd: (input: NewEntryInput) => void;
  recentTags: string[];
}

/** Parse trailing "#tag" tokens out of the raw text. */
function parse(raw: string): { text: string; tag?: string } {
  const match = raw.match(/(?:^|\s)#([\w-]+)\s*$/);
  if (match) {
    return { text: raw.replace(/\s*#[\w-]+\s*$/, "").trim(), tag: match[1] };
  }
  return { text: raw.trim() };
}

export const QuickAdd = forwardRef<HTMLInputElement, Props>(
  ({ onAdd, recentTags }, ref) => {
    const [value, setValue] = useState("");
    const [status, setStatus] = useState<EntryStatus>("done");
    const [date, setDate] = useState(todayKey());
    const dateRef = useRef<HTMLInputElement>(null);

    const submit = () => {
      const { text, tag } = parse(value);
      if (!text) return;
      onAdd({ text, tag, status, date });
      setValue("");
      // Keep the chosen date so you can log several things for the same day.
    };

    const openDatePicker = () => {
      const el = dateRef.current;
      if (!el) return;
      if (typeof el.showPicker === "function") el.showPicker();
      else el.focus();
    };

    const dateLabel = date === todayKey() ? "Today" : relativeDay(date);
    const isPast = date !== todayKey();

    const showTagHint = /#[\w-]*$/.test(value);
    const typed = value.match(/#([\w-]*)$/)?.[1]?.toLowerCase() ?? "";
    const suggestions = showTagHint
      ? recentTags
          .filter((t) => t.toLowerCase().startsWith(typed) && t.toLowerCase() !== typed)
          .slice(0, 5)
      : [];

    return (
      <div
        className="surface animate-rise relative rounded-[var(--radius-card)] p-2"
        style={{ boxShadow: "var(--shadow)" }}
      >
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="flex min-w-0 flex-1 items-center gap-2">
          <span
            className="grid h-7 w-7 shrink-0 place-items-center rounded-md"
            style={{
              background: status === "done" ? "var(--done-soft)" : "var(--planned-soft)",
              color: status === "done" ? "var(--done)" : "var(--planned)",
            }}
            aria-hidden
          >
            {status === "done" ? "✓" : "→"}
          </span>

          <input
            ref={ref}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") submit();
              if (e.key === "Escape") (e.target as HTMLInputElement).blur();
            }}
            placeholder={
              status === "done"
                ? "What did you just ship?  (add #tag)"
                : "What do you plan to do?  (add #tag)"
            }
            className="ring-focus min-w-0 flex-1 rounded-md bg-transparent px-1 py-1.5 text-[15px] placeholder:text-[var(--text-faint)] focus:outline-none"
            aria-label="Add an entry"
          />
          </div>

          <div className="flex items-center justify-between gap-2 sm:justify-end">
            {/* Date — defaults to Today; tap to log for another day. */}
            <button
              onClick={openDatePicker}
              onDoubleClick={() =>
                setDate((d) => (d === todayKey() ? yesterdayKey() : todayKey()))
              }
              title="Set the day (e.g. log something from yesterday)"
              className="ring-focus inline-flex h-8 shrink-0 items-center gap-1.5 rounded-md px-2.5 text-xs font-medium transition-colors"
              style={{
                background: isPast ? "var(--accent-soft)" : "var(--bg-subtle)",
                color: isPast ? "var(--accent)" : "var(--text-muted)",
                border: "1px solid var(--border)",
              }}
            >
              <CalendarDays size={13} />
              {dateLabel}
            </button>

            <StatusToggle value={status} onChange={setStatus} size="sm" />

            <button
              onClick={submit}
              disabled={!parse(value).text}
              className="ring-focus inline-flex h-8 shrink-0 items-center gap-1.5 rounded-md px-3 text-sm font-medium text-[var(--accent-fg)] transition-opacity disabled:cursor-not-allowed disabled:opacity-40"
              style={{ background: "var(--accent)" }}
              aria-label="Add entry"
            >
              Add <CornerDownLeft size={14} strokeWidth={2.4} />
            </button>
          </div>
        </div>

        {/* Hidden native date input, opened by the date button */}
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

        {suggestions.length > 0 && (
          <div className="animate-in mt-2 flex flex-wrap gap-1.5 px-1 pb-1">
            {suggestions.map((t) => (
              <button
                key={t}
                onMouseDown={(e) => {
                  e.preventDefault();
                  setValue((v) => v.replace(/#[\w-]*$/, `#${t} `));
                }}
                className="ring-focus inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs text-muted transition-colors hover:text-[var(--text)]"
                style={{ background: "var(--bg-subtle)" }}
              >
                <Hash size={11} /> {t}
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }
);

QuickAdd.displayName = "QuickAdd";
