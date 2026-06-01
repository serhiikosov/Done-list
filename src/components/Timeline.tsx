import { useMemo } from "react";
import { CheckCircle2, Inbox } from "lucide-react";
import type { Entry, Grouping } from "../types";
import { groupKey, groupLabel, parseKey } from "../lib/date";
import { EntryItem } from "./EntryItem";

interface Props {
  entries: Entry[];
  grouping: Grouping;
  onToggle: (id: string) => void;
  onEdit: (entry: Entry) => void;
  onRemove: (id: string) => void;
  onTagClick: (tag: string) => void;
  emptyHint: string;
}

interface Bucket {
  key: string;
  date: Date;
  entries: Entry[];
  doneCount: number;
  plannedCount: number;
}

export function Timeline({
  entries,
  grouping,
  onToggle,
  onEdit,
  onRemove,
  onTagClick,
  emptyHint,
}: Props) {
  const buckets = useMemo<Bucket[]>(() => {
    const map = new Map<string, Bucket>();
    for (const e of entries) {
      const key = groupKey(parseKey(e.date), grouping);
      let b = map.get(key);
      if (!b) {
        b = { key, date: parseKey(key), entries: [], doneCount: 0, plannedCount: 0 };
        map.set(key, b);
      }
      b.entries.push(e);
      if (e.status === "done") b.doneCount++;
      else b.plannedCount++;
    }
    const list = [...map.values()].sort((a, b) => b.key.localeCompare(a.key));
    // Within a bucket: planned first (so "next" is visible), then by recency.
    for (const b of list) {
      b.entries.sort((x, y) => {
        if (x.status !== y.status) return x.status === "planned" ? -1 : 1;
        if (x.date !== y.date) return y.date.localeCompare(x.date);
        return y.createdAt - x.createdAt;
      });
    }
    return list;
  }, [entries, grouping]);

  if (buckets.length === 0) {
    return (
      <div className="animate-in mt-16 flex flex-col items-center text-center">
        <span
          className="grid h-12 w-12 place-items-center rounded-full"
          style={{ background: "var(--bg-subtle)" }}
        >
          <Inbox size={22} className="text-faint" />
        </span>
        <p className="mt-4 text-[15px] font-medium">Nothing here yet</p>
        <p className="mt-1 max-w-xs text-sm text-muted">{emptyHint}</p>
      </div>
    );
  }

  const showDay = grouping !== "day";

  return (
    <div className="flex flex-col gap-8">
      {buckets.map((b) => {
        const { title, subtitle } = groupLabel(b.date, grouping);
        return (
          <section key={b.key} className="animate-in">
            {/* Sticky group header */}
            <div
              className="sticky top-0 z-10 -mx-2 mb-1 flex items-baseline gap-2 px-2 py-1.5 backdrop-blur"
              style={{ background: "color-mix(in srgb, var(--bg) 78%, transparent)" }}
            >
              <h2 className="text-[13px] font-semibold tracking-tight">{title}</h2>
              {subtitle && <span className="text-xs text-faint">{subtitle}</span>}
              <span className="ml-auto inline-flex items-center gap-2 text-xs text-faint">
                {b.doneCount > 0 && (
                  <span className="inline-flex items-center gap-1" style={{ color: "var(--done)" }}>
                    <CheckCircle2 size={12} /> {b.doneCount}
                  </span>
                )}
                {b.plannedCount > 0 && (
                  <span style={{ color: "var(--planned)" }}>→ {b.plannedCount}</span>
                )}
              </span>
            </div>

            <div className="flex flex-col">
              {b.entries.map((e) => (
                <EntryItem
                  key={e.id}
                  entry={e}
                  showDay={showDay}
                  onToggle={onToggle}
                  onEdit={onEdit}
                  onRemove={onRemove}
                  onTagClick={onTagClick}
                />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
