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
  /** Links this entry to the goal action it came from (for toggle/sync). */
  goalId?: string;
  createdAt: number;
  updatedAt: number;
  /** Soft-delete tombstone so deletions propagate across synced devices. */
  deleted?: boolean;
}

export interface AppState {
  entries: Entry[];
  /** Schema version, for safe future migrations. */
  version: number;
}

export type GoalHorizon = "3-year" | "1-year" | "quarter" | "month" | "week";

export type GoalPace = "chill" | "balanced" | "intense";

export interface GoalMetric {
  unit: string;
  start: number;
  current: number;
  target: number;
}

export interface GoalLayer {
  horizon: GoalHorizon;
  label: string;
  items: string[];
}

export interface Goal {
  id: string;
  title: string;
  /** Free context, e.g. "gain 6kg, currently 72kg". */
  detail?: string;
  /** The furthest horizon this goal spans. */
  horizon: GoalHorizon;
  /** When true, AI picks the realistic timeframe during breakdown. */
  auto?: boolean;
  /** How aggressive the plan should be. */
  pace?: GoalPace;
  /** Optional numeric metric to track (e.g. weight 72→78 kg). */
  metric?: GoalMetric;
  /** AI-generated, user-editable breakdown. */
  summary?: string;
  layers: GoalLayer[];
  /** Weekly action texts already pushed to Today (so they aren't re-added). */
  added?: string[];
  /** Milestone/action texts marked complete (tracking progress per horizon). */
  done?: string[];
  createdAt: number;
  updatedAt: number;
  deleted?: boolean;
}
