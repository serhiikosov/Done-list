import type { Entry } from "../types";
import { todayKey, lastWorkingDayKey, fullDate } from "./date";

export interface StandupData {
  yesterdayKey: string;
  todayKey: string;
  yesterdayDone: Entry[];
  /** What you've already shipped today. */
  todayDone: Entry[];
  todayPlanned: Entry[];
  /** Anything still marked planned from before today — carried over / blocked. */
  carriedOver: Entry[];
}

export function buildStandup(entries: Entry[]): StandupData {
  const tKey = todayKey();
  const yKey = lastWorkingDayKey();

  const yesterdayDone = entries
    .filter((e) => e.status === "done" && e.date === yKey)
    .sort((a, b) => a.createdAt - b.createdAt);

  const todayDone = entries
    .filter((e) => e.status === "done" && e.date === tKey)
    .sort((a, b) => a.createdAt - b.createdAt);

  const todayPlanned = entries
    .filter((e) => e.status === "planned" && e.date === tKey)
    .sort((a, b) => a.createdAt - b.createdAt);

  const carriedOver = entries
    .filter((e) => e.status === "planned" && e.date < tKey)
    .sort((a, b) => a.date.localeCompare(b.date));

  return {
    yesterdayKey: yKey,
    todayKey: tKey,
    yesterdayDone,
    todayDone,
    todayPlanned,
    carriedOver,
  };
}

export type StandupScope = "all" | "yesterday" | "today";
export type StandupFormat = "plain" | "slack";

/** Build a copy-paste script for the given scope and format. */
export function buildStandupText(
  data: StandupData,
  scope: StandupScope,
  format: StandupFormat
): string {
  const slack = format === "slack";
  const bullet = (e: Entry) =>
    slack
      ? `• ${e.text}${e.tag ? ` \`${e.tag}\`` : ""}`
      : `• ${e.text}${e.tag ? `  (${e.tag})` : ""}`;
  const head = (text: string) => (slack ? `*${text}*` : text);

  const lines: string[] = [];

  const wantYesterday = scope === "all" || scope === "yesterday";
  const wantToday = scope === "all" || scope === "today";

  if (wantYesterday) {
    lines.push(head(`Yesterday — ${fullDate(data.yesterdayKey)}`));
    if (data.yesterdayDone.length) data.yesterdayDone.forEach((e) => lines.push(bullet(e)));
    else lines.push("• (nothing logged)");
  }

  if (wantToday) {
    if (lines.length) lines.push("");
    lines.push(head(`Today — ${fullDate(data.todayKey)}`));
    if (data.todayPlanned.length) data.todayPlanned.forEach((e) => lines.push(bullet(e)));
    else lines.push("• (nothing planned yet)");
  }

  if (scope === "all" && data.carriedOver.length) {
    lines.push("");
    lines.push(head("Still open / carried over"));
    data.carriedOver.forEach((e) => lines.push(bullet(e)));
  }

  return lines.join("\n");
}
