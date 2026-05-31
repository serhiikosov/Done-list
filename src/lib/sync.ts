import {
  createClient,
  type SupabaseClient,
  type Session,
} from "@supabase/supabase-js";
import type { Entry } from "../types";

const CONFIG_KEY = "done-list:supabase";
const TABLE = "entries";

export interface SupabaseConfig {
  url: string;
  anonKey: string;
}

export function getConfig(): SupabaseConfig | null {
  try {
    const raw = localStorage.getItem(CONFIG_KEY);
    if (!raw) return null;
    const c = JSON.parse(raw);
    if (c && typeof c.url === "string" && typeof c.anonKey === "string" && c.url && c.anonKey)
      return c;
    return null;
  } catch {
    return null;
  }
}

export function setConfig(c: SupabaseConfig | null) {
  if (c) localStorage.setItem(CONFIG_KEY, JSON.stringify(c));
  else localStorage.removeItem(CONFIG_KEY);
  client = undefined; // force re-create on next use
}

let client: SupabaseClient | undefined;

export function getClient(): SupabaseClient | null {
  if (client) return client;
  const cfg = getConfig();
  if (!cfg) return null;
  client = createClient(cfg.url, cfg.anonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      storageKey: "done-list:auth",
    },
  });
  return client;
}

// ── Row <-> Entry mapping ──────────────────────────────────────────
interface Row {
  id: string;
  user_id?: string;
  text: string;
  entry_date: string;
  status: string;
  tag: string | null;
  created_at: number;
  updated_at: number;
  deleted: boolean;
}

function toRow(e: Entry, userId: string): Row {
  return {
    id: e.id,
    user_id: userId,
    text: e.text,
    entry_date: e.date,
    status: e.status,
    tag: e.tag ?? null,
    created_at: e.createdAt,
    updated_at: e.updatedAt,
    deleted: !!e.deleted,
  };
}

function fromRow(r: Row): Entry {
  return {
    id: r.id,
    text: r.text,
    date: r.entry_date,
    status: r.status === "planned" ? "planned" : "done",
    tag: r.tag ?? undefined,
    createdAt: Number(r.created_at),
    updatedAt: Number(r.updated_at),
    deleted: !!r.deleted,
  };
}

// ── Auth ───────────────────────────────────────────────────────────
export async function signIn(email: string, password: string) {
  const c = getClient();
  if (!c) throw new Error("Supabase is not configured");
  const { error } = await c.auth.signInWithPassword({ email, password });
  if (error) throw error;
}

export async function signUp(email: string, password: string) {
  const c = getClient();
  if (!c) throw new Error("Supabase is not configured");
  const { data, error } = await c.auth.signUp({ email, password });
  if (error) throw error;
  // If email confirmation is on, there's no session yet.
  return { needsConfirmation: !data.session };
}

export async function signOut() {
  const c = getClient();
  if (c) await c.auth.signOut();
}

export async function getSession(): Promise<Session | null> {
  const c = getClient();
  if (!c) return null;
  const { data } = await c.auth.getSession();
  return data.session;
}

export function onAuthChange(cb: (session: Session | null) => void): () => void {
  const c = getClient();
  if (!c) return () => {};
  const { data } = c.auth.onAuthStateChange((_event, session) => cb(session));
  return () => data.subscription.unsubscribe();
}

// ── Data ───────────────────────────────────────────────────────────
export async function pull(): Promise<Entry[]> {
  const c = getClient();
  if (!c) return [];
  const { data, error } = await c.from(TABLE).select("*");
  if (error) throw error;
  return (data as Row[]).map(fromRow);
}

export async function push(entries: Entry[], userId: string): Promise<void> {
  const c = getClient();
  if (!c || entries.length === 0) return;
  const rows = entries.map((e) => toRow(e, userId));
  // Upsert in chunks to stay well under payload limits.
  for (let i = 0; i < rows.length; i += 200) {
    const chunk = rows.slice(i, i + 200);
    const { error } = await c.from(TABLE).upsert(chunk, { onConflict: "id" });
    if (error) throw error;
  }
}

export function subscribeToChanges(
  userId: string,
  onRow: (entry: Entry) => void
): () => void {
  const c = getClient();
  if (!c) return () => {};
  const channel = c
    .channel("entries-sync")
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: TABLE, filter: `user_id=eq.${userId}` },
      (payload) => {
        const row = payload.new as Row;
        if (row && row.id) onRow(fromRow(row));
      }
    )
    .subscribe();
  return () => {
    c.removeChannel(channel);
  };
}

/** The SQL a user runs once in the Supabase SQL editor to set things up. */
export const SETUP_SQL = `create table if not exists entries (
  id text primary key,
  user_id uuid not null default auth.uid(),
  text text not null,
  entry_date date not null,
  status text not null,
  tag text,
  created_at bigint not null,
  updated_at bigint not null,
  deleted boolean not null default false
);

alter table entries enable row level security;

create policy "Users manage their own entries"
  on entries for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

alter publication supabase_realtime add table entries;`;
