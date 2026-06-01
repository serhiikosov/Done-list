import { Check, Trash2, ArrowRight } from "lucide-react";
import type { Entry } from "../types";
import { relativeDay } from "../lib/date";
import { tagColor } from "../lib/tags";

interface Props {
  entry: Entry;
  /** Show the day on the right (used in week/month/year groupings). */
  showDay?: boolean;
  onToggle: (id: string) => void;
  onEdit: (entry: Entry) => void;
  onRemove: (id: string) => void;
  onTagClick?: (tag: string) => void;
}

export function EntryItem({ entry, showDay, onToggle, onEdit, onRemove, onTagClick }: Props) {
  const done = entry.status === "done";
  const tc = entry.tag ? tagColor(entry.tag) : null;

  return (
    <div
      className="group flex items-center gap-3 px-4 py-3.5 transition-colors"
      onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-hover)")}
      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
    >
      {/* Status circle */}
      <button
        onClick={() => onToggle(entry.id)}
        className="ring-focus tap grid h-[22px] w-[22px] shrink-0 place-items-center rounded-full border-2 transition-all"
        style={{
          background: done ? "var(--done)" : "transparent",
          borderColor: done ? "var(--done)" : "var(--planned)",
        }}
        aria-label={done ? "Mark as planned" : "Mark as done"}
      >
        {done ? (
          <Check size={13} strokeWidth={3} color="#fff" />
        ) : (
          <ArrowRight size={12} strokeWidth={2.5} color="var(--planned)" />
        )}
      </button>

      {/* Text + meta — tap to edit */}
      <button onClick={() => onEdit(entry)} className="ring-focus min-w-0 flex-1 text-left">
        <span className="block text-[17px] leading-snug">{entry.text}</span>
        {(entry.tag || showDay) && (
          <span className="mt-1.5 flex flex-wrap items-center gap-2">
            {entry.tag && tc && (
              <span
                onClick={(e) => {
                  e.stopPropagation();
                  onTagClick?.(entry.tag!);
                }}
                className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[12px]"
                style={{ background: "var(--bg-subtle)" }}
              >
                <span className="h-1.5 w-1.5 rounded-full" style={{ background: tc.color }} />
                <span className="text-muted">{entry.tag}</span>
              </span>
            )}
            {showDay && <span className="text-[13px] text-faint">{relativeDay(entry.date)}</span>}
          </span>
        )}
      </button>

      {/* Delete — pointer devices */}
      <button
        onClick={() => onRemove(entry.id)}
        className="ring-focus hidden h-8 w-8 shrink-0 place-items-center rounded-lg text-faint opacity-0 transition-all hover:text-[var(--text)] group-hover:opacity-100 sm:grid"
        aria-label="Delete entry"
      >
        <Trash2 size={15} />
      </button>
    </div>
  );
}
