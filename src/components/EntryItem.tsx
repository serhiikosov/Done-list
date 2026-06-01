import { Check, Trash2, ArrowRight } from "lucide-react";
import type { Entry } from "../types";
import { relativeDay } from "../lib/date";
import { tagColor } from "../lib/tags";
import { SwipeRow } from "./SwipeRow";

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
    <SwipeRow
      bg="var(--bg-elevated)"
      leftAction={{ icon: <Check size={20} strokeWidth={3} />, bg: "var(--done)" }}
      onSwipeRight={() => onToggle(entry.id)}
      rightAction={{ icon: <Trash2 size={20} />, bg: "#e5484d" }}
      onSwipeLeft={() => onRemove(entry.id)}
    >
      <div
        className="group flex items-start gap-3 px-4 py-3.5 transition-colors"
        onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-hover)")}
        onMouseLeave={(e) => (e.currentTarget.style.background = "var(--bg-elevated)")}
      >
        {/* Status checkbox */}
        <button
          onClick={() => onToggle(entry.id)}
          className="ring-focus tap mt-0.5 grid h-[22px] w-[22px] shrink-0 place-items-center rounded-md border transition-all"
          style={{
            background: done ? "var(--done)" : "transparent",
            borderColor: done ? "var(--done)" : "var(--border-strong)",
          }}
          aria-label={done ? "Mark as planned" : "Mark as done"}
        >
          {done ? (
            <Check size={14} strokeWidth={3} color="#fff" />
          ) : (
            <ArrowRight size={13} strokeWidth={2.5} color="var(--planned)" />
          )}
        </button>

        {/* Text + meta — tap to edit */}
        <button onClick={() => onEdit(entry)} className="ring-focus min-w-0 flex-1 text-left">
          <span className="block text-[17px] leading-snug">{entry.text}</span>
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
        </button>

        {/* Delete — pointer devices (mobile uses swipe) */}
        <button
          onClick={() => onRemove(entry.id)}
          className="ring-focus mt-0.5 hidden h-7 w-7 shrink-0 place-items-center rounded-md text-faint opacity-0 transition-all hover:text-[var(--text)] group-hover:opacity-100 sm:grid"
          onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-subtle)")}
          onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
          aria-label="Delete entry"
        >
          <Trash2 size={14} />
        </button>
      </div>
    </SwipeRow>
  );
}
