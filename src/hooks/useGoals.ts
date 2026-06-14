import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Goal } from "../types";
import { cryptoId } from "../lib/storage";

const KEY = "done-list:goals";

function load(): Goal[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export interface NewGoal {
  title: string;
  detail?: string;
  horizon: Goal["horizon"];
  auto?: boolean;
  metric?: Goal["metric"];
}

export function useGoals() {
  const [all, setAll] = useState<Goal[]>(() => load());
  const first = useRef(true);

  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    try {
      localStorage.setItem(KEY, JSON.stringify(all));
    } catch {
      /* ignore */
    }
  }, [all]);

  const goals = useMemo(() => all.filter((g) => !g.deleted), [all]);

  const add = useCallback((input: NewGoal): Goal => {
    const now = Date.now();
    const goal: Goal = {
      id: cryptoId(),
      title: input.title.trim(),
      detail: input.detail?.trim() || undefined,
      horizon: input.horizon,
      auto: input.auto,
      metric: input.metric,
      layers: [],
      createdAt: now,
      updatedAt: now,
    };
    setAll((prev) => [goal, ...prev]);
    return goal;
  }, []);

  const update = useCallback((id: string, patch: Partial<Goal>) => {
    setAll((prev) =>
      prev.map((g) => (g.id === id ? { ...g, ...patch, updatedAt: Date.now() } : g))
    );
  }, []);

  const remove = useCallback((id: string) => {
    setAll((prev) => prev.map((g) => (g.id === id ? { ...g, deleted: true, updatedAt: Date.now() } : g)));
  }, []);

  /** Merge remote goals in by id, newest updatedAt wins. */
  const mergeRemote = useCallback((rows: Goal[]) => {
    setAll((prev) => {
      const byId = new Map(prev.map((g) => [g.id, g]));
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

  return { goals, all, add, update, remove, mergeRemote };
}
