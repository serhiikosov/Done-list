import { useMemo, useState } from "react";
import { Check, Copy } from "lucide-react";
import type { Entry } from "../types";
import { relativeDay } from "../lib/date";

interface Props {
  entries: Entry[];
  scopeLabel: string;
}

/** A slim summary line: counts + one-tap "what I shipped" recap copy. */
export function ReviewBar({ entries, scopeLabel }: Props) {
  const [copied, setCopied] = useState(false);

  const { doneCount, plannedCount, recap } = useMemo(() => {
    const done = entries.filter((e) => e.status === "done");
    const lines = [`Shipped — ${scopeLabel}`];
    for (const e of done) lines.push(`• ${e.text}${e.tag ? `  (${e.tag})` : ""}  — ${relativeDay(e.date)}`);
    if (done.length === 0) lines.push("• (nothing yet)");
    return { doneCount: done.length, plannedCount: entries.length - done.length, recap: lines.join("\n") };
  }, [entries, scopeLabel]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(recap);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* ignore */
    }
  };

  return (
    <div className="mb-5 flex items-center justify-between">
      <div className="flex items-center gap-2 text-[15px]">
        <span className="font-semibold tabular-nums" style={{ color: "var(--done)" }}>
          {doneCount}
        </span>
        <span className="text-muted">done</span>
        <span className="text-faint">·</span>
        <span className="font-semibold tabular-nums" style={{ color: "var(--planned)" }}>
          {plannedCount}
        </span>
        <span className="text-muted">planned</span>
      </div>
      <button
        onClick={copy}
        className="ring-focus tap inline-flex h-9 items-center gap-1.5 rounded-full px-3.5 text-[13px] font-medium text-muted"
        style={{ background: "var(--bg-subtle)", border: "1px solid var(--border)" }}
      >
        {copied ? <Check size={14} style={{ color: "var(--done)" }} /> : <Copy size={14} />}
        Recap
      </button>
    </div>
  );
}
