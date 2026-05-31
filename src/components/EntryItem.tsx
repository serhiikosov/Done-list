import { useEffect, useRef, useState } from "react";
import { Check, Hash, Trash2, ArrowRight, CalendarDays, CalendarArrowUp } from "lucide-react";
import type { Entry } from "../types";
import { relativeDay, todayKey } from "../lib/date";

interface Props {
  entry: Entry;
  /** Show the day on the right (used in week/month/year groupings). */
  showDay?: boolean;
  onToggle: (id: string) => void;
  onUpdate: (id: string, patch: Partial<Entry>) => void;
  onRemove: (id: string) => void;
  onTagClick?: (tag: string) => void;
}

export function EntryItem({
  entry,
  showDay,
  onToggle,
  onUpdate,
  onRemove,
  onTagClick,
}: Props) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(entry.text);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const dateRef = useRef<HTMLInputElement>(null);
  const done = entry.status === "done";
  const isToday = entry.date === todayKey();

  useEffect(() => {
    if (editing && inputRef.current) {
      const el = inputRef.current;
      el.focus();
      el.setSelectionRange(el.value.length, el.value.length);
      el.style.height = "auto";
      el.style.height = el.scrollHeight + "px";
    }
  }, [editing]);

  const commit = () => {
    const text = draft.trim();
    if (text && text !== entry.text) onUpdate(entry.id, { text });
    else setDraft(entry.text);
    setEditing(false);
  };

  const openDatePicker = () => {
    const el = dateRef.current;
    if (!el) return;
    // showPicker() is the reliable way to open the native calendar on tap.
    if (typeof el.showPicker === "function") el.showPicker();
    else el.focus();
  };

  return (
    <div
      className="group relative flex items-start gap-3 rounded-lg px-2.5 py-2 transition-colors"
      style={{ background: "transparent" }}
      onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-hover)")}
      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
    >
      {/* Status checkbox */}
      <button
        onClick={() => onToggle(entry.id)}
        className="ring-focus mt-0.5 grid h-[18px] w-[18px] shrink-0 place-items-center rounded-md border transition-all"
        style={{
          background: done ? "var(--done)" : "transparent",
          borderColor: done ? "var(--done)" : "var(--border-strong)",
        }}
        aria-label={done ? "Mark as planned" : "Mark as done"}
        title={done ? "Done — tap to move back to planned" : "Planned — tap to mark done"}
      >
        {done ? (
          <Check size={12} strokeWidth={3} color="#fff" />
        ) : (
          <ArrowRight size={11} strokeWidth={2.5} color="var(--planned)" />
        )}
      </button>

      {/* Text + meta */}
      <div className="min-w-0 flex-1">
        {editing ? (
          <textarea
            ref={inputRef}
            value={draft}
            onChange={(e) => {
              setDraft(e.target.value);
              e.target.style.height = "auto";
              e.target.style.height = e.target.scrollHeight + "px";
            }}
            onBlur={commit}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                commit();
              }
              if (e.key === "Escape") {
                setDraft(entry.text);
                setEditing(false);
              }
            }}
            rows={1}
            className="ring-focus w-full resize-none rounded-md bg-transparent text-[15px] leading-snug focus:outline-none"
          />
        ) : (
          <button
            onClick={() => {
              setDraft(entry.text);
              setEditing(true);
            }}
            className="block w-full cursor-text text-left text-[15px] leading-snug"
          >
            {entry.text}
          </button>
        )}

        <div className="mt-0.5 flex flex-wrap items-center gap-x-2.5 gap-y-1">
          {entry.tag && (
            <button
              onClick={() => onTagClick?.(entry.tag!)}
              className="ring-focus inline-flex items-center gap-0.5 text-xs text-faint transition-colors hover:text-[var(--accent)]"
            >
              <Hash size={11} />
              {entry.tag}
            </button>
          )}
          {showDay && (
            <button
              onClick={openDatePicker}
              className="ring-focus text-xs text-faint transition-colors hover:text-[var(--accent)]"
            >
              {relativeDay(entry.date)}
            </button>
          )}
        </div>
      </div>

      {/* Actions — always visible on touch, reveal on hover for pointer devices */}
      <div className="mt-0.5 flex shrink-0 items-center gap-0.5 opacity-100 transition-opacity sm:opacity-0 sm:group-focus-within:opacity-100 sm:group-hover:opacity-100">
        {!isToday && (
          <ActionButton
            label="Move to today"
            onClick={() => onUpdate(entry.id, { date: todayKey() })}
          >
            <CalendarArrowUp size={14} />
          </ActionButton>
        )}
        <ActionButton label="Change date" onClick={openDatePicker}>
          <CalendarDays size={14} />
        </ActionButton>
        <ActionButton label="Delete entry" onClick={() => onRemove(entry.id)} danger>
          <Trash2 size={14} />
        </ActionButton>
      </div>

      {/* Hidden native date input, driven by the buttons above */}
      <input
        ref={dateRef}
        type="date"
        value={entry.date}
        max={todayKey()}
        onChange={(e) => {
          if (e.target.value) onUpdate(entry.id, { date: e.target.value });
        }}
        className="pointer-events-none absolute h-0 w-0 opacity-0"
        tabIndex={-1}
        aria-hidden
      />
    </div>
  );
}

function ActionButton({
  label,
  onClick,
  danger,
  children,
}: {
  label: string;
  onClick: () => void;
  danger?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      title={label}
      className="ring-focus grid h-7 w-7 place-items-center rounded-md text-faint transition-colors hover:text-[var(--text)]"
      onMouseEnter={(e) => {
        e.currentTarget.style.background = "var(--bg-subtle)";
        if (danger) e.currentTarget.style.color = "#e5484d";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = "transparent";
        e.currentTarget.style.color = "var(--text-faint)";
      }}
    >
      {children}
    </button>
  );
}
