import type { EntryStatus } from "../types";

interface Props {
  value: EntryStatus;
  onChange: (s: EntryStatus) => void;
  size?: "sm" | "md";
}

/** Segmented Done / Planned switch, Linear-style. */
export function StatusToggle({ value, onChange, size = "md" }: Props) {
  const pad = size === "sm" ? "px-2 py-1 text-xs" : "px-3 py-1.5 text-sm";
  return (
    <div
      className="inline-flex rounded-lg p-0.5"
      style={{ background: "var(--bg-subtle)", border: "1px solid var(--border)" }}
      role="tablist"
      aria-label="Entry status"
    >
      {(["done", "planned"] as const).map((s) => {
        const active = value === s;
        const color = s === "done" ? "var(--done)" : "var(--planned)";
        return (
          <button
            key={s}
            role="tab"
            aria-selected={active}
            onClick={() => onChange(s)}
            className={`${pad} ring-focus rounded-md font-medium capitalize transition-colors`}
            style={{
              background: active ? "var(--bg-elevated)" : "transparent",
              color: active ? color : "var(--text-muted)",
              boxShadow: active ? "var(--shadow)" : "none",
            }}
          >
            {s}
          </button>
        );
      })}
    </div>
  );
}
