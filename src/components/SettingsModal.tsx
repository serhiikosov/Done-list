import { useEffect, useState } from "react";
import {
  X,
  Check,
  Copy,
  RefreshCw,
  LogOut,
  Cloud,
  CloudOff,
  CircleAlert,
} from "lucide-react";
import { getConfig, SETUP_SQL } from "../lib/sync";
import type { useSync } from "../hooks/useSync";

interface Props {
  open: boolean;
  onClose: () => void;
  sync: ReturnType<typeof useSync>;
}

export function SettingsModal({ open, onClose, sync }: Props) {
  const existing = getConfig();
  const [url, setUrl] = useState(existing?.url ?? "");
  const [anonKey, setAnonKey] = useState(existing?.anonKey ?? "");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [sqlCopied, setSqlCopied] = useState(false);

  useEffect(() => {
    if (open) {
      const c = getConfig();
      setUrl(c?.url ?? "");
      setAnonKey(c?.anonKey ?? "");
      setNotice(null);
    }
  }, [open]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    if (open) window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const connect = () => {
    sync.configure({ url: url.trim().replace(/\/$/, ""), anonKey: anonKey.trim() });
    setNotice("Connected. Now create an account or sign in below.");
  };

  const disconnect = async () => {
    await sync.signOut();
    sync.configure(null);
    setNotice("Disconnected. Your data stays on this device.");
  };

  const doSignIn = async () => {
    setBusy(true);
    setNotice(null);
    try {
      await sync.signIn(email.trim(), password);
    } catch {
      /* error shown via sync.error */
    } finally {
      setBusy(false);
    }
  };

  const doSignUp = async () => {
    setBusy(true);
    setNotice(null);
    try {
      const res = await sync.signUp(email.trim(), password);
      if (res?.needsConfirmation)
        setNotice("Account created — check your email to confirm, then sign in.");
    } catch {
      /* error shown via sync.error */
    } finally {
      setBusy(false);
    }
  };

  const copySql = async () => {
    try {
      await navigator.clipboard.writeText(SETUP_SQL);
      setSqlCopied(true);
      setTimeout(() => setSqlCopied(false), 1600);
    } catch {
      /* ignore */
    }
  };

  return (
    <div
      className="animate-in fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-4 sm:items-center"
      style={{ background: "rgba(0,0,0,0.45)" }}
      onClick={onClose}
    >
      <div
        className="surface animate-rise my-auto w-full max-w-lg rounded-2xl p-5"
        style={{ boxShadow: "var(--shadow)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-semibold">Sync &amp; settings</h2>
          <button
            onClick={onClose}
            className="ring-focus grid h-8 w-8 place-items-center rounded-lg text-muted"
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>

        {/* Status line */}
        <StatusBadge sync={sync} />

        {/* Errors / notices */}
        {sync.error && (
          <p
            className="mt-3 rounded-lg px-3 py-2 text-xs"
            style={{ background: "var(--planned-soft)", color: "var(--planned)" }}
          >
            {sync.error}
          </p>
        )}
        {notice && (
          <p
            className="mt-3 rounded-lg px-3 py-2 text-xs"
            style={{ background: "var(--accent-soft)", color: "var(--accent)" }}
          >
            {notice}
          </p>
        )}

        {/* Step 1 — connect to a Supabase project */}
        {!sync.configured ? (
          <div className="mt-4 flex flex-col gap-3">
            <p className="text-sm text-muted">
              Sync your entries across devices with your own free{" "}
              <a
                href="https://supabase.com"
                target="_blank"
                rel="noreferrer"
                className="underline"
                style={{ color: "var(--accent)" }}
              >
                Supabase
              </a>{" "}
              project. One-time setup:
            </p>
            <ol className="ml-4 list-decimal text-sm text-muted [&>li]:mb-1">
              <li>Create a project at supabase.com.</li>
              <li>
                In <b>SQL Editor</b>, run the snippet below (creates the table + privacy
                rules).
              </li>
              <li>
                In <b>Project Settings → API Keys</b>, copy the <b>Project URL</b> and the{" "}
                <b>Publishable key</b> (<code>sb_publishable_…</code>, or the legacy{" "}
                <b>anon</b> key). Never use the secret key.
              </li>
            </ol>

            <div className="relative">
              <pre
                className="max-h-40 overflow-auto rounded-lg p-3 text-[11px] leading-relaxed"
                style={{ background: "var(--bg-subtle)", border: "1px solid var(--border)" }}
              >
                {SETUP_SQL}
              </pre>
              <button
                onClick={copySql}
                className="ring-focus absolute right-2 top-2 inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px]"
                style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)" }}
              >
                {sqlCopied ? <Check size={11} style={{ color: "var(--done)" }} /> : <Copy size={11} />}
                SQL
              </button>
            </div>

            <Field label="Project URL" value={url} onChange={setUrl} placeholder="https://xxxx.supabase.co" />
            <Field
              label="Publishable / anon key"
              value={anonKey}
              onChange={setAnonKey}
              placeholder="sb_publishable_…  or  eyJhbGciOi…"
              mono
            />
            <button
              onClick={connect}
              disabled={!url.trim() || !anonKey.trim()}
              className="ring-focus h-9 rounded-lg text-sm font-medium text-[var(--accent-fg)] disabled:opacity-40"
              style={{ background: "var(--accent)" }}
            >
              Connect project
            </button>
          </div>
        ) : !sync.signedIn ? (
          /* Step 2 — sign in / create account */
          <div className="mt-4 flex flex-col gap-3">
            <p className="text-sm text-muted">
              Use the same email &amp; password on every device to share your list.
            </p>
            <Field label="Email" value={email} onChange={setEmail} placeholder="you@example.com" type="email" />
            <Field
              label="Password"
              value={password}
              onChange={setPassword}
              placeholder="••••••••"
              type="password"
            />
            <div className="flex gap-2">
              <button
                onClick={doSignIn}
                disabled={busy || !email.trim() || !password}
                className="ring-focus h-9 flex-1 rounded-lg text-sm font-medium text-[var(--accent-fg)] disabled:opacity-40"
                style={{ background: "var(--accent)" }}
              >
                Sign in
              </button>
              <button
                onClick={doSignUp}
                disabled={busy || !email.trim() || !password}
                className="ring-focus h-9 flex-1 rounded-lg text-sm font-medium disabled:opacity-40"
                style={{ background: "var(--bg-subtle)", border: "1px solid var(--border)" }}
              >
                Create account
              </button>
            </div>
            <button
              onClick={disconnect}
              className="ring-focus mt-1 text-xs text-faint hover:text-[var(--text)]"
            >
              Disconnect this project
            </button>
          </div>
        ) : (
          /* Step 3 — signed in */
          <div className="mt-4 flex flex-col gap-3">
            <p className="text-sm">
              Signed in as <b>{sync.email}</b>. Your entries sync automatically.
            </p>
            <div className="flex gap-2">
              <button
                onClick={sync.syncNow}
                className="ring-focus inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-lg text-sm font-medium"
                style={{ background: "var(--bg-subtle)", border: "1px solid var(--border)" }}
              >
                <RefreshCw size={14} /> Sync now
              </button>
              <button
                onClick={sync.signOut}
                className="ring-focus inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-lg text-sm font-medium"
                style={{ background: "var(--bg-subtle)", border: "1px solid var(--border)" }}
              >
                <LogOut size={14} /> Sign out
              </button>
            </div>
            <button
              onClick={disconnect}
              className="ring-focus text-xs text-faint hover:text-[var(--text)]"
            >
              Disconnect this project
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function StatusBadge({ sync }: { sync: ReturnType<typeof useSync> }) {
  const map: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
    disabled: { label: "Local only", color: "var(--text-faint)", icon: <CloudOff size={14} /> },
    signedOut: { label: "Connected — not signed in", color: "var(--planned)", icon: <Cloud size={14} /> },
    syncing: { label: "Syncing…", color: "var(--accent)", icon: <RefreshCw size={14} /> },
    synced: { label: "Synced", color: "var(--done)", icon: <Check size={14} /> },
    error: { label: "Sync error", color: "var(--planned)", icon: <CircleAlert size={14} /> },
  };
  const s = map[sync.status] ?? map.disabled;
  return (
    <div
      className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium"
      style={{ background: "var(--bg-subtle)", border: "1px solid var(--border)", color: s.color }}
    >
      {s.icon} {s.label}
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  mono,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  mono?: boolean;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-xs font-medium text-muted">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoCapitalize="off"
        autoCorrect="off"
        spellCheck={false}
        className={`ring-focus h-9 rounded-lg px-3 text-sm focus:outline-none ${mono ? "font-mono text-xs" : ""}`}
        style={{ background: "var(--bg-subtle)", border: "1px solid var(--border)" }}
      />
    </label>
  );
}
