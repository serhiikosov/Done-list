import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Entry, EntryStatus } from "../types";
import { cryptoId, load, save } from "../lib/storage";
import { todayKey } from "../lib/date";

export interface NewEntryInput {
  text: string;
  status: EntryStatus;
  date?: string;
  tag?: string;
}

export function useEntries() {
  // `all` includes soft-deleted tombstones (needed for cross-device sync);
  // the UI consumes `entries`, which hides them.
  const [all, setAll] = useState<Entry[]>(() => load().entries);
  const firstRender = useRef(true);

  const entries = useMemo(() => all.filter((e) => !e.deleted), [all]);

  // Persist on every change (skip the first run to avoid a redundant write).
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    save({ entries: all, version: 1 });
  }, [all]);

  // Keep multiple tabs in sync.
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === "done-list:v1") setAll(load().entries);
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const add = useCallback((input: NewEntryInput): Entry => {
    const now = Date.now();
    const entry: Entry = {
      id: cryptoId(),
      text: input.text.trim(),
      date: input.date ?? todayKey(),
      status: input.status,
      tag: input.tag?.trim() || undefined,
      createdAt: now,
      updatedAt: now,
    };
    setAll((prev) => [entry, ...prev]);
    return entry;
  }, []);

  const update = useCallback((id: string, patch: Partial<Entry>) => {
    setAll((prev) =>
      prev.map((e) => (e.id === id ? { ...e, ...patch, updatedAt: Date.now() } : e))
    );
  }, []);

  const remove = useCallback((id: string) => {
    // Soft delete so the deletion can propagate to other devices.
    setAll((prev) =>
      prev.map((e) =>
        e.id === id ? { ...e, deleted: true, updatedAt: Date.now() } : e
      )
    );
  }, []);

  const toggleStatus = useCallback((id: string) => {
    setAll((prev) =>
      prev.map((e) =>
        e.id === id
          ? {
              ...e,
              status: e.status === "done" ? "planned" : "done",
              updatedAt: Date.now(),
            }
          : e
      )
    );
  }, []);

  const replaceAll = useCallback((next: Entry[]) => setAll(next), []);

  /** Merge remote rows in by id, keeping whichever side was updated last. */
  const mergeRemote = useCallback((rows: Entry[]) => {
    setAll((prev) => {
      const byId = new Map(prev.map((e) => [e.id, e]));
      let changed = false;
      for (const r of rows) {
        const local = byId.get(r.id);
        if (!local || r.updatedAt > local.updatedAt) {
          byId.set(r.id, r);
          changed = true;
        }
      }
      if (!changed) return prev;
      return [...byId.values()].sort((a, b) => b.createdAt - a.createdAt);
    });
  }, []);

  return {
    entries,
    all,
    add,
    update,
    remove,
    toggleStatus,
    replaceAll,
    mergeRemote,
  };
}
