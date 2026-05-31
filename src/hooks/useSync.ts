import { useCallback, useEffect, useRef, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import type { Entry } from "../types";
import {
  getConfig,
  setConfig,
  getSession,
  onAuthChange,
  pull,
  push,
  subscribeToChanges,
  signIn as apiSignIn,
  signUp as apiSignUp,
  signOut as apiSignOut,
  type SupabaseConfig,
} from "../lib/sync";

export type SyncStatus = "disabled" | "signedOut" | "syncing" | "synced" | "error";

function msg(e: unknown): string {
  if (e instanceof Error) return e.message;
  return String(e);
}

export function useSync(all: Entry[], mergeRemote: (rows: Entry[]) => void) {
  const [configured, setConfigured] = useState(() => !!getConfig());
  const [session, setSession] = useState<Session | null>(null);
  const [status, setStatus] = useState<SyncStatus>(configured ? "signedOut" : "disabled");
  const [error, setError] = useState<string | null>(null);
  const pushTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const userId = session?.user?.id ?? null;
  const email = session?.user?.email ?? null;

  // Track auth session whenever sync is configured.
  useEffect(() => {
    if (!configured) {
      setStatus("disabled");
      setSession(null);
      return;
    }
    let active = true;
    getSession()
      .then((s) => active && setSession(s))
      .catch(() => {});
    const unsub = onAuthChange((s) => active && setSession(s));
    return () => {
      active = false;
      unsub();
    };
  }, [configured]);

  // On sign-in: pull everything, then keep listening for remote changes.
  useEffect(() => {
    if (!configured) return;
    if (!userId) {
      setStatus("signedOut");
      return;
    }
    let cancelled = false;
    let unsub = () => {};
    (async () => {
      try {
        setStatus("syncing");
        const rows = await pull();
        if (cancelled) return;
        mergeRemote(rows);
        setStatus("synced");
        setError(null);
      } catch (e) {
        if (!cancelled) {
          setStatus("error");
          setError(msg(e));
        }
      }
      if (!cancelled) {
        unsub = subscribeToChanges(userId, (entry) => mergeRemote([entry]));
      }
    })();
    return () => {
      cancelled = true;
      unsub();
    };
  }, [configured, userId, mergeRemote]);

  // Debounced push of local state whenever it changes (while signed in).
  useEffect(() => {
    if (!configured || !userId) return;
    clearTimeout(pushTimer.current);
    pushTimer.current = setTimeout(async () => {
      try {
        await push(all, userId);
        setStatus((s) => (s === "error" ? s : "synced"));
      } catch (e) {
        setStatus("error");
        setError(msg(e));
      }
    }, 1000);
    return () => clearTimeout(pushTimer.current);
  }, [all, configured, userId]);

  const configure = useCallback((cfg: SupabaseConfig | null) => {
    setConfig(cfg);
    setConfigured(!!cfg);
    setError(null);
  }, []);

  const signIn = useCallback(async (em: string, pw: string) => {
    setError(null);
    try {
      await apiSignIn(em, pw);
    } catch (e) {
      setError(msg(e));
      throw e;
    }
  }, []);

  const signUp = useCallback(async (em: string, pw: string) => {
    setError(null);
    try {
      return await apiSignUp(em, pw);
    } catch (e) {
      setError(msg(e));
      throw e;
    }
  }, []);

  const signOut = useCallback(async () => {
    await apiSignOut();
  }, []);

  const syncNow = useCallback(async () => {
    if (!userId) return;
    try {
      setStatus("syncing");
      const rows = await pull();
      mergeRemote(rows);
      await push(all, userId);
      setStatus("synced");
      setError(null);
    } catch (e) {
      setStatus("error");
      setError(msg(e));
    }
  }, [all, userId, mergeRemote]);

  return {
    configured,
    status,
    error,
    email,
    signedIn: !!userId,
    configure,
    signIn,
    signUp,
    signOut,
    syncNow,
  };
}
