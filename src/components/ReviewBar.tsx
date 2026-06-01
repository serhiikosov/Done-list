import { useMemo, useState } from "react";
import { Check, Copy, Hash } from "lucide-react";
import type { Entry } from "../types";
import { tagColor } from "../lib/tags";
import { relativeDay } from "../lib/date";

interface Props {
  entries: Entry[];
  scopeLabel: string;
}

/** A compact "what I shipped" summary + one-tap recap copy. */
export function ReviewBar({ entries, scopeLabel }: Props) {
  const [copied, setCopied] = useState(false);

  const { doneCount, plannedCount, topTags, recap } = useMemo(() => {
    const done = entries.filter((e) => e.status === "done");
    const counts = new Map<string, number>();
    for (const e of entries) if (e.tag) counts.set(e.tag, (counts.get(e.tag) ?? 0) + 1);
    const top = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 4);

    const lines = [`Shipped — ${scopeLabel}`];
    for (const e of done) lines.push(`• ${e.text}${e.tag ? `  (${e.tag})` : ""}  — ${relativeDay(e.date)}`);
    if (done.length === 0) lines.push("• (nothing yet)");

    return {
      doneCount: done.length,
      plannedCount: entries.length - done.length,
      topTags: top,
      recap: lines.join("\n"),
    };
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
    <div
      className="mb-6 rounded-2xl p-4"
      style={{ background: "var(--bg-subtle)", border: "1px solid var(--border)" }}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Stat value={doneCount} label="done" color="var(--done)" />
          <Stat value={plannedCount} label="planned" color="var(--planned)" />
        </div>
        <button
          onClick={copy}
          className="ring-focus tap inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-xs font-medium"
          style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)" }}
        >
          {copied ? <Check size={13} style={{ color: "var(--done)" }} /> : <Copy size={13} />}
          Recap
        </button>
      </div>
      {topTags.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {topTags.map(([tag, n]) => {
            const tc = tagColor(tag);
            return (
              <span
                key={tag}
                className="inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[11px] font-medium"
                style={{ background: tc.soft, color: tc.color }}
              >
                <Hash size={10} />
                {tag} · {n}
              </span>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Stat({ value, label, color }: { value: number; label: string; color: string }) {
  return (
    <div className="flex items-baseline gap-1.5">
      <span className="text-xl font-bold tabular-nums" style={{ color }}>
        {value}
      </span>
      <span className="text-xs text-muted">{label}</span>
    </div>
  );
}
