import { useEffect, useState } from "react";
import { X, Copy, Check, Sparkles, RefreshCw, Settings } from "lucide-react";
import { useScrollLock } from "../hooks/useScrollLock";

interface Props {
  open: boolean;
  title: string;
  generate: (() => Promise<string>) | null;
  onClose: () => void;
  onOpenSettings: () => void;
}

export function AISheet({ open, title, generate, onClose, onOpenSettings }: Props) {
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  useScrollLock(open);

  useEffect(() => {
    if (!open || !generate) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    setText("");
    generate()
      .then((r) => !cancelled && setText(r))
      .catch((e) => !cancelled && setError(e instanceof Error ? e.message : String(e)))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const regenerate = () => {
    if (!generate || loading) return;
    setLoading(true);
    setError(null);
    setText("");
    generate()
      .then(setText)
      .catch((e) => setError(e instanceof Error ? e.message : String(e)))
      .finally(() => setLoading(false));
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* ignore */
    }
  };

  if (!open) return null;
  const needsKey = error?.includes("API key");

  return (
    <div
      className="animate-in fixed inset-0 z-[60] flex items-end justify-center sm:items-center"
      style={{ background: "rgba(0,0,0,0.5)", backdropFilter: "blur(2px)" }}
      onClick={onClose}
    >
      <div
        className="animate-sheet surface flex max-h-[85vh] w-full max-w-lg flex-col rounded-t-3xl pb-safe sm:rounded-3xl"
        style={{ boxShadow: "var(--shadow)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 pb-1 pt-4">
          <h3 className="flex items-center gap-2 text-base font-semibold">
            <Sparkles size={17} style={{ color: "var(--accent)" }} />
            {title}
          </h3>
          <button
            onClick={onClose}
            className="ring-focus tap grid h-8 w-8 place-items-center rounded-full text-muted"
            style={{ background: "var(--bg-subtle)" }}
            aria-label="Close"
          >
            <X size={15} />
          </button>
        </div>

        <div className="min-h-[120px] flex-1 overflow-y-auto px-5 py-4">
          {loading ? (
            <div className="flex items-center gap-2 text-[15px] text-muted">
              <RefreshCw size={16} className="animate-spin" />
              Thinking…
            </div>
          ) : error ? (
            <div className="flex flex-col items-start gap-3">
              <p
                className="rounded-xl px-3 py-2 text-[14px]"
                style={{ background: "var(--planned-soft)", color: "var(--planned)" }}
              >
                {error}
              </p>
              {needsKey && (
                <button
                  onClick={onOpenSettings}
                  className="ring-focus tap inline-flex h-9 items-center gap-1.5 rounded-full px-4 text-[14px] font-medium text-[var(--accent-fg)]"
                  style={{ background: "var(--accent)" }}
                >
                  <Settings size={15} /> Add API key
                </button>
              )}
            </div>
          ) : (
            <p className="whitespace-pre-wrap text-[16px] leading-relaxed">{text}</p>
          )}
        </div>

        {!loading && !error && (
          <div className="flex gap-2 px-5 pb-5 pt-1">
            <button
              onClick={regenerate}
              className="ring-focus tap inline-flex h-11 items-center justify-center gap-1.5 rounded-2xl px-4 text-[15px] font-medium"
              style={{ background: "var(--bg-subtle)", border: "1px solid var(--border)" }}
            >
              <RefreshCw size={15} /> Redo
            </button>
            <button
              onClick={copy}
              className="ring-focus tap inline-flex h-11 flex-1 items-center justify-center gap-1.5 rounded-2xl text-[15px] font-semibold text-[var(--accent-fg)]"
              style={{ background: "var(--accent)" }}
            >
              {copied ? <Check size={16} /> : <Copy size={16} />}
              {copied ? "Copied" : "Copy"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
