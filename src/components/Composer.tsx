import { useEffect, useRef, useState } from "react";
import { Check, ArrowRight, Hash, CalendarDays, X, Mic } from "lucide-react";
import type { EntryStatus } from "../types";
import type { NewEntryInput } from "../hooks/useEntries";
import { todayKey, yesterdayKey, relativeDay } from "../lib/date";
import { useScrollLock } from "../hooks/useScrollLock";

interface Props {
  open: boolean;
  onClose: () => void;
  onAdd: (input: NewEntryInput) => void;
  recentTags: string[];
}

function parse(raw: string): { text: string; tag?: string } {
  const match = raw.match(/(?:^|\s)#([\w-]+)\s*$/);
  if (match) return { text: raw.replace(/\s*#[\w-]+\s*$/, "").trim(), tag: match[1] };
  return { text: raw.trim() };
}

export function Composer({ open, onClose, onAdd, recentTags }: Props) {
  const [value, setValue] = useState("");
  const [status, setStatus] = useState<EntryStatus>("done");
  const [date, setDate] = useState(todayKey());
  const [listening, setListening] = useState(false);
  const taRef = useRef<HTMLTextAreaElement>(null);
  const dateRef = useRef<HTMLInputElement>(null);
  const recRef = useRef<{ stop: () => void } | null>(null);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const SpeechRec: any =
    typeof window !== "undefined"
      ? (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
      : undefined;

  useEffect(() => {
    if (open) {
      setValue("");
      setStatus("done");
      setDate(todayKey());
      // Let the sheet animate in before focusing (smoother on iOS).
      const t = setTimeout(() => taRef.current?.focus(), 120);
      return () => clearTimeout(t);
    } else {
      recRef.current?.stop();
    }
  }, [open]);

  const toggleVoice = () => {
    if (!SpeechRec) return;
    if (listening) {
      recRef.current?.stop();
      return;
    }
    const rec = new SpeechRec();
    rec.lang = navigator.language || "en-US";
    rec.interimResults = false;
    rec.continuous = false;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    rec.onresult = (ev: any) => {
      const t = Array.from(ev.results)
        .map((r: any) => r[0].transcript)
        .join(" ")
        .trim();
      if (t) setValue((v) => (v ? v.trimEnd() + " " : "") + t);
    };
    rec.onend = () => setListening(false);
    rec.onerror = () => setListening(false);
    recRef.current = rec;
    setListening(true);
    rec.start();
  };

  useScrollLock(open);

  if (!open) return null;

  const { text, tag } = parse(value);
  const canAdd = !!text;

  const submit = () => {
    if (!canAdd) return;
    onAdd({ text, tag, status, date });
    onClose();
  };

  const openDatePicker = () => {
    const el = dateRef.current;
    if (!el) return;
    if (typeof el.showPicker === "function") el.showPicker();
    else el.focus();
  };

  const typed = value.match(/#([\w-]*)$/)?.[1]?.toLowerCase() ?? "";
  const showTagHint = /#[\w-]*$/.test(value);
  const suggestions = showTagHint
    ? recentTags.filter((t) => t.toLowerCase().startsWith(typed) && t.toLowerCase() !== typed).slice(0, 6)
    : recentTags.slice(0, 6);

  const dateChips: { key: string; label: string }[] = [
    { key: todayKey(), label: "Today" },
    { key: yesterdayKey(), label: "Yesterday" },
  ];
  const customDate = date !== todayKey() && date !== yesterdayKey();

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
        {/* Grabber + close */}
        <div className="flex items-center justify-between px-5 pt-3">
          <span
            className="mx-auto h-1 w-9 rounded-full sm:hidden"
            style={{ background: "var(--border-strong)" }}
          />
          <button
            onClick={onClose}
            className="ring-focus tap absolute right-3 top-3 grid h-8 w-8 place-items-center rounded-full text-muted sm:right-4"
            style={{ background: "var(--bg-subtle)" }}
            aria-label="Close"
          >
            <X size={15} />
          </button>
        </div>

        <div className="flex flex-col gap-4 px-5 pb-5 pt-3">
          {/* Status choice — two big, obvious options */}
          <div className="grid grid-cols-2 gap-2">
            <StatusCard
              active={status === "done"}
              onClick={() => setStatus("done")}
              icon={<Check size={16} strokeWidth={3} />}
              title="Done"
              subtitle="Something I shipped"
              color="var(--done)"
              soft="var(--done-soft)"
            />
            <StatusCard
              active={status === "planned"}
              onClick={() => setStatus("planned")}
              icon={<ArrowRight size={16} strokeWidth={2.6} />}
              title="Planned"
              subtitle="Intend to do"
              color="var(--planned)"
              soft="var(--planned-soft)"
            />
          </div>

          {/* The text */}
          <div className="relative">
            <textarea
              ref={taRef}
              value={value}
              onChange={(e) => {
                setValue(e.target.value);
                e.target.style.height = "auto";
                e.target.style.height = Math.min(e.target.scrollHeight, 160) + "px";
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  submit();
                }
                if (e.key === "Escape") onClose();
              }}
              rows={2}
              placeholder={status === "done" ? "What did you ship?" : "What will you do?"}
              className="ring-focus w-full resize-none rounded-2xl py-3 pl-4 pr-12 text-[17px] leading-snug placeholder:text-[var(--text-faint)] focus:outline-none"
              style={{ background: "var(--bg-subtle)", border: "1px solid var(--border)" }}
            />
            {SpeechRec && (
              <button
                onClick={toggleVoice}
                aria-label={listening ? "Stop dictation" : "Dictate"}
                className="ring-focus tap absolute bottom-2.5 right-2.5 grid h-8 w-8 place-items-center rounded-full transition-colors"
                style={{
                  background: listening ? "var(--accent)" : "var(--bg-elevated)",
                  color: listening ? "var(--accent-fg)" : "var(--text-muted)",
                  border: "1px solid var(--border)",
                }}
              >
                <Mic size={15} className={listening ? "animate-pulse" : ""} />
              </button>
            )}
          </div>

          {/* Tag suggestions */}
          {suggestions.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {suggestions.map((t) => (
                <button
                  key={t}
                  onClick={() =>
                    setValue((v) =>
                      /#[\w-]*$/.test(v) ? v.replace(/#[\w-]*$/, `#${t} `) : `${v.trimEnd()} #${t} `.trimStart()
                    )
                  }
                  className="ring-focus tap inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs text-muted"
                  style={{ background: "var(--bg-subtle)", border: "1px solid var(--border)" }}
                >
                  <Hash size={11} />
                  {t}
                </button>
              ))}
            </div>
          )}

          {/* When */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium uppercase tracking-wider text-faint">When</span>
            <div className="flex items-center gap-1.5">
              {dateChips.map((c) => (
                <Chip key={c.key} active={date === c.key} onClick={() => setDate(c.key)}>
                  {c.label}
                </Chip>
              ))}
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

          {/* Primary action */}
          <button
            onClick={submit}
            disabled={!canAdd}
            className="ring-focus tap h-12 rounded-2xl text-[15px] font-semibold text-[var(--accent-fg)] transition-opacity disabled:opacity-40"
            style={{ background: "var(--accent)" }}
          >
            Add {status === "done" ? "done" : "plan"}
          </button>
        </div>
      </div>
    </div>
  );
}

function StatusCard({
  active,
  onClick,
  icon,
  title,
  subtitle,
  color,
  soft,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  color: string;
  soft: string;
}) {
  return (
    <button
      onClick={onClick}
      className="ring-focus tap flex items-center gap-2.5 rounded-2xl px-3 py-2.5 text-left transition-all"
      style={{
        background: active ? soft : "var(--bg-subtle)",
        border: `1.5px solid ${active ? color : "var(--border)"}`,
      }}
    >
      <span
        className="grid h-8 w-8 shrink-0 place-items-center rounded-full"
        style={{ background: active ? color : "var(--bg-elevated)", color: active ? "#fff" : "var(--text-faint)" }}
      >
        {icon}
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-semibold" style={{ color: active ? color : "var(--text)" }}>
          {title}
        </span>
        <span className="block text-[11px] text-faint">{subtitle}</span>
      </span>
    </button>
  );
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className="ring-focus tap inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium transition-colors"
      style={{
        background: active ? "var(--accent-soft)" : "var(--bg-subtle)",
        color: active ? "var(--accent)" : "var(--text-muted)",
        border: `1px solid ${active ? "transparent" : "var(--border)"}`,
      }}
    >
      {children}
    </button>
  );
}
