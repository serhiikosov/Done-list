import type { AppState, Entry } from "../types";

const KEY = "done-list:v1";
const SCHEMA_VERSION = 1;

function makeSeed(): Entry[] {
  // A tiny, friendly first-run example so the app never looks broken-empty.
  const now = Date.now();
  const d = new Date();
  const today = fmt(d);
  const y = new Date(d);
  y.setDate(y.getDate() - 1);
  const yesterday = fmt(y);

  return [
    {
      id: cryptoId(),
      text: "Set up the Done list and made it my own",
      date: yesterday,
      status: "done",
      tag: "setup",
      createdAt: now - 5000,
      updatedAt: now - 5000,
    },
    {
      id: cryptoId(),
      text: "Tell my team what I shipped at standup",
      date: today,
      status: "planned",
      tag: "ritual",
      createdAt: now,
      updatedAt: now,
    },
  ];
}

function fmt(d: Date): string {
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

export function cryptoId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export function load(): AppState {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) {
      return { entries: makeSeed(), version: SCHEMA_VERSION };
    }
    const parsed = JSON.parse(raw) as AppState;
    if (!parsed || !Array.isArray(parsed.entries)) {
      return { entries: makeSeed(), version: SCHEMA_VERSION };
    }
    return { entries: parsed.entries, version: SCHEMA_VERSION };
  } catch {
    return { entries: makeSeed(), version: SCHEMA_VERSION };
  }
}

export function save(state: AppState): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    /* storage full / unavailable — fail silently, app still works in-memory */
  }
}

export function exportJSON(entries: Entry[]): string {
  return JSON.stringify({ version: SCHEMA_VERSION, entries }, null, 2);
}

export function importJSON(text: string): Entry[] | null {
  try {
    const parsed = JSON.parse(text);
    const entries = Array.isArray(parsed) ? parsed : parsed?.entries;
    if (!Array.isArray(entries)) return null;
    // Light validation/normalisation.
    return entries
      .filter((e) => e && typeof e.text === "string" && typeof e.date === "string")
      .map((e) => ({
        id: typeof e.id === "string" ? e.id : cryptoId(),
        text: e.text,
        date: e.date,
        status: e.status === "planned" ? "planned" : "done",
        tag: typeof e.tag === "string" ? e.tag : undefined,
        createdAt: typeof e.createdAt === "number" ? e.createdAt : Date.now(),
        updatedAt: typeof e.updatedAt === "number" ? e.updatedAt : Date.now(),
      }));
  } catch {
    return null;
  }
}
