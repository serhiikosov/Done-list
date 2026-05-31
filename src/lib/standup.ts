import type { Entry } from "../types";
import { todayKey, lastWorkingDayKey, fullDate } from "./date";

export interface StandupData {
  yesterdayKey: string;
  todayKey: string;
  yesterdayDone: Entry[];
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

  const todayPlanned = entries
    .filter((e) => e.status === "planned" && e.date === tKey)
    .sort((a, b) => a.createdAt - b.createdAt);

  const carriedOver = entries
    .filter((e) => e.status === "planned" && e.date < tKey)
    .sort((a, b) => a.date.localeCompare(b.date));

  return { yesterdayKey: yKey, todayKey: tKey, yesterdayDone, todayPlanned, carriedOver };
}

/** Plain-text script you can read aloud or paste into Slack. */
export function standupToText(data: StandupData): string {
  const lines: string[] = [];
  const bullet = (e: Entry) => `• ${e.text}${e.tag ? `  (${e.tag})` : ""}`;

  lines.push(`Yesterday — ${fullDate(data.yesterdayKey)}`);
  if (data.yesterdayDone.length) {
    data.yesterdayDone.forEach((e) => lines.push(bullet(e)));
  } else {
    lines.push("• (nothing logged)");
  }

  lines.push("");
  lines.push(`Today — ${fullDate(data.todayKey)}`);
  if (data.todayPlanned.length) {
    data.todayPlanned.forEach((e) => lines.push(bullet(e)));
  } else {
    lines.push("• (nothing planned yet)");
  }

  if (data.carriedOver.length) {
    lines.push("");
    lines.push("Still open / carried over");
    data.carriedOver.forEach((e) => lines.push(bullet(e)));
  }

  return lines.join("\n");
}
