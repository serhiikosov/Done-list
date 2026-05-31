import { useEffect, useRef, useState } from "react";
import { Check, Hash, Trash2, ArrowRight } from "lucide-react";
import type { Entry } from "../types";
import { relativeDay } from "../lib/date";

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
  const done = entry.status === "done";

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

  return (
    <div
      className="group flex items-start gap-3 rounded-lg px-2.5 py-2 transition-colors"
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
        title={done ? "Done — click to move back to planned" : "Planned — click to mark done"}
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
            style={{ color: done ? "var(--text)" : "var(--text)" }}
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
            <span className="text-xs text-faint">{relativeDay(entry.date)}</span>
          )}
        </div>
      </div>

      {/* Delete (reveals on hover) */}
      <button
        onClick={() => onRemove(entry.id)}
        className="ring-focus mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-md text-faint opacity-0 transition-all hover:text-[var(--text)] group-hover:opacity-100 focus-visible:opacity-100"
        onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-subtle)")}
        onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
        aria-label="Delete entry"
      >
        <Trash2 size={14} />
      </button>
    </div>
  );
}
