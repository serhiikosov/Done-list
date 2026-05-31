import { useCallback, useEffect, useRef, useState } from "react";
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
  const [entries, setEntries] = useState<Entry[]>(() => load().entries);
  const firstRender = useRef(true);

  // Persist on every change (skip the very first run to avoid a redundant write).
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    save({ entries, version: 1 });
  }, [entries]);

  // Keep multiple tabs in sync.
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === "done-list:v1") setEntries(load().entries);
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
    setEntries((prev) => [entry, ...prev]);
    return entry;
  }, []);

  const update = useCallback((id: string, patch: Partial<Entry>) => {
    setEntries((prev) =>
      prev.map((e) =>
        e.id === id ? { ...e, ...patch, updatedAt: Date.now() } : e
      )
    );
  }, []);

  const remove = useCallback((id: string) => {
    setEntries((prev) => prev.filter((e) => e.id !== id));
  }, []);

  const toggleStatus = useCallback((id: string) => {
    setEntries((prev) =>
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

  const replaceAll = useCallback((next: Entry[]) => setEntries(next), []);

  return { entries, add, update, remove, toggleStatus, replaceAll };
}
