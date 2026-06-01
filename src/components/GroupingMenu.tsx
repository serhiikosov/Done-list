import { useState } from "react";
import { ChevronDown, Check } from "lucide-react";

interface Option {
  id: string;
  label: string;
}

interface Props {
  value: string;
  options: Option[];
  onChange: (id: string) => void;
}

/** Compact iOS-style dropdown — for settings you change rarely (grouping). */
export function GroupingMenu({ value, options, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const current = options.find((o) => o.id === value);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="ring-focus tap inline-flex h-10 items-center gap-1.5 rounded-full px-4 text-[15px] font-medium"
        style={{ background: "var(--bg-subtle)", border: "1px solid var(--border)" }}
      >
        {current?.label}
        <ChevronDown size={16} className="text-faint" />
      </button>

      {open && (
        <>
          <button
            className="fixed inset-0 z-40"
            aria-hidden
            tabIndex={-1}
            onClick={() => setOpen(false)}
          />
          <div
            className="surface animate-pop absolute right-0 z-50 mt-2 w-44 overflow-hidden rounded-2xl p-1"
            style={{ boxShadow: "var(--shadow)" }}
            role="menu"
          >
            {options.map((o) => (
              <button
                key={o.id}
                role="menuitemradio"
                aria-checked={o.id === value}
                onClick={() => {
                  onChange(o.id);
                  setOpen(false);
                }}
                className="ring-focus tap flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-[15px]"
                style={{ background: o.id === value ? "var(--bg-hover)" : "transparent" }}
              >
                {o.label}
                {o.id === value && <Check size={16} style={{ color: "var(--accent)" }} />}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
