import { useEffect, useRef, useState } from "react";
import { Check, ArrowRight, Hash, CalendarDays, X, Trash2 } from "lucide-react";
import type { Entry, EntryStatus } from "../types";
import { todayKey, yesterdayKey, relativeDay } from "../lib/date";
import { tagColor } from "../lib/tags";
import { useScrollLock } from "../hooks/useScrollLock";

interface Props {
  entry: Entry | null;
  onClose: () => void;
  onUpdate: (id: string, patch: Partial<Entry>) => void;
  onRemove: (id: string) => void;
  recentTags: string[];
}

export function EntrySheet({ entry, onClose, onUpdate, onRemove, recentTags }: Props) {
  const [text, setText] = useState("");
  const [status, setStatus] = useState<EntryStatus>("done");
  const [date, setDate] = useState(todayKey());
  const [tag, setTag] = useState<string | undefined>(undefined);
  const taRef = useRef<HTMLTextAreaElement>(null);
  const dateRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (entry) {
      setText(entry.text);
      setStatus(entry.status);
      setDate(entry.date);
      setTag(entry.tag);
    }
  }, [entry]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    if (entry) window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [entry, onClose]);

  // Size the textarea to its content when opened.
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
    onUpdate(entry.id, { text: t, status, date, tag: tag || undefined });
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
        <div className="flex items-center justify-between px-5 pb-1 pt-4">
          <h3 className="text-base font-semibold">Edit</h3>
          <button
            onClick={onClose}
            className="ring-focus tap grid h-8 w-8 place-items-center rounded-full text-muted"
            style={{ background: "var(--bg-subtle)" }}
            aria-label="Close"
          >
            <X size={15} />
          </button>
        </div>

        <div className="flex flex-col gap-4 px-5 pb-5 pt-3">
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

          <div className="flex gap-2">
            <button
              onClick={() => {
                onRemove(entry.id);
                onClose();
              }}
              className="ring-focus tap grid h-12 w-12 shrink-0 place-items-center rounded-2xl"
              style={{ background: "var(--bg-subtle)", border: "1px solid var(--border)", color: "#e5484d" }}
              aria-label="Delete"
            >
              <Trash2 size={18} />
            </button>
            <button
              onClick={save}
              disabled={!text.trim()}
              className="ring-focus tap h-12 flex-1 rounded-2xl text-[15px] font-semibold text-[var(--accent-fg)] disabled:opacity-40"
              style={{ background: "var(--accent)" }}
            >
              Save
            </button>
          </div>
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
