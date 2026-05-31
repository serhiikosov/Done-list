export type EntryStatus = "done" | "planned";

export type Grouping = "day" | "week" | "month" | "year";

export interface Entry {
  id: string;
  /** The thing you did or plan to do. */
  text: string;
  /** Calendar day this entry belongs to, as YYYY-MM-DD (local). */
  date: string;
  /** "done" = shipped, "planned" = intend to do. */
  status: EntryStatus;
  /** Optional free-form tag, e.g. a project or area. */
  tag?: string;
  createdAt: number;
  updatedAt: number;
}

export interface AppState {
  entries: Entry[];
  /** Schema version, for safe future migrations. */
  version: number;
}
