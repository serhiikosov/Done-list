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

  return { goals, add, update, remove };
}
