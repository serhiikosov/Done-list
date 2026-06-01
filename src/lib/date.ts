import {
  format,
  parseISO,
  startOfDay,
  endOfDay,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  startOfYear,
  endOfYear,
  addDays,
  addWeeks,
  addMonths,
  addYears,
  isToday,
  isYesterday,
  isThisWeek,
  isThisYear,
  isWithinInterval,
  differenceInCalendarDays,
  subDays,
} from "date-fns";
import type { Grouping } from "../types";

/** Local YYYY-MM-DD key for a Date (avoids UTC drift from toISOString). */
export function toDateKey(d: Date): string {
  return format(d, "yyyy-MM-dd");
}

export function todayKey(): string {
  return toDateKey(new Date());
}

/** Calendar yesterday (not skipping weekends). */
export function yesterdayKey(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return toDateKey(d);
}

/** The previous *working* day relative to today (skips Sat/Sun back to Fri). */
export function lastWorkingDayKey(from: Date = new Date()): string {
  let d = subDays(from, 1);
  const dow = d.getDay();
  if (dow === 0) d = subDays(d, 2); // Sunday -> Friday
  else if (dow === 6) d = subDays(d, 1); // Saturday -> Friday
  return toDateKey(d);
}

export function parseKey(key: string): Date {
  return parseISO(key);
}

/** Stable sort key (string) that buckets a date into a grouping. */
export function groupKey(date: Date, grouping: Grouping): string {
  switch (grouping) {
    case "day":
      return toDateKey(date);
    case "week":
      return toDateKey(startOfWeek(date, { weekStartsOn: 1 }));
    case "month":
      return toDateKey(startOfMonth(date));
    case "year":
      return toDateKey(startOfYear(date));
  }
}

/** Human label + sublabel for a group header. */
export function groupLabel(
  bucketDate: Date,
  grouping: Grouping
): { title: string; subtitle: string } {
  switch (grouping) {
    case "day": {
      let title: string;
      if (isToday(bucketDate)) title = "Today";
      else if (isYesterday(bucketDate)) title = "Yesterday";
      else title = format(bucketDate, "EEEE");
      return {
        title,
        subtitle: format(bucketDate, isThisYear(bucketDate) ? "MMM d" : "MMM d, yyyy"),
      };
    }
    case "week": {
      const start = startOfWeek(bucketDate, { weekStartsOn: 1 });
      const end = endOfWeek(bucketDate, { weekStartsOn: 1 });
      const sameMonth = start.getMonth() === end.getMonth();
      const range = sameMonth
        ? `${format(start, "MMM d")} – ${format(end, "d")}`
        : `${format(start, "MMM d")} – ${format(end, "MMM d")}`;
      return {
        title: isThisWeek(bucketDate, { weekStartsOn: 1 })
          ? "This week"
          : `Week of ${format(start, "MMM d")}`,
        subtitle: isThisYear(start) ? range : `${range}, ${format(start, "yyyy")}`,
      };
    }
    case "month":
      return {
        title: format(bucketDate, "MMMM"),
        subtitle: format(bucketDate, "yyyy"),
      };
    case "year":
      return { title: format(bucketDate, "yyyy"), subtitle: "" };
  }
}

/** Relative "2d ago" style label for an entry's exact day. */
export function relativeDay(key: string): string {
  const d = parseKey(key);
  if (isToday(d)) return "Today";
  if (isYesterday(d)) return "Yesterday";
  const diff = differenceInCalendarDays(new Date(), d);
  if (diff > 1 && diff < 7) return format(d, "EEEE");
  return format(d, isThisYear(d) ? "MMM d" : "MMM d, yyyy");
}

export function fullDate(key: string): string {
  return format(parseKey(key), "EEEE, MMMM d, yyyy");
}

// ── Period navigation (one period at a time, swipe prev/next) ────────
export function periodStart(d: Date, g: Grouping): Date {
  switch (g) {
    case "day":
      return startOfDay(d);
    case "week":
      return startOfWeek(d, { weekStartsOn: 1 });
    case "month":
      return startOfMonth(d);
    case "year":
      return startOfYear(d);
  }
}

export function periodEnd(d: Date, g: Grouping): Date {
  switch (g) {
    case "day":
      return endOfDay(d);
    case "week":
      return endOfWeek(d, { weekStartsOn: 1 });
    case "month":
      return endOfMonth(d);
    case "year":
      return endOfYear(d);
  }
}

export function shiftPeriod(d: Date, g: Grouping, dir: 1 | -1): Date {
  switch (g) {
    case "day":
      return addDays(d, dir);
    case "week":
      return addWeeks(d, dir);
    case "month":
      return addMonths(d, dir);
    case "year":
      return addYears(d, dir);
  }
}

/** True if the period containing `d` is wholly in the past (so "next" is allowed). */
export function canGoNext(d: Date, g: Grouping): boolean {
  return periodEnd(d, g).getTime() < Date.now();
}

export function inPeriod(key: string, d: Date, g: Grouping): boolean {
  return isWithinInterval(parseKey(key), { start: periodStart(d, g), end: periodEnd(d, g) });
}

/** Big title for the current period. */
export function periodLabel(d: Date, g: Grouping): { title: string; subtitle: string } {
  switch (g) {
    case "day": {
      let title: string;
      if (isToday(d)) title = "Today";
      else if (isYesterday(d)) title = "Yesterday";
      else title = format(d, "EEEE");
      return { title, subtitle: format(d, isThisYear(d) ? "MMMM d" : "MMMM d, yyyy") };
    }
    case "week": {
      const s = startOfWeek(d, { weekStartsOn: 1 });
      const e = endOfWeek(d, { weekStartsOn: 1 });
      const range =
        s.getMonth() === e.getMonth()
          ? `${format(s, "MMM d")} – ${format(e, "d")}`
          : `${format(s, "MMM d")} – ${format(e, "MMM d")}`;
      return {
        title: isThisWeek(d, { weekStartsOn: 1 }) ? "This week" : "Week",
        subtitle: isThisYear(s) ? range : `${range}, ${format(s, "yyyy")}`,
      };
    }
    case "month":
      return { title: format(d, "MMMM"), subtitle: format(d, "yyyy") };
    case "year":
      return { title: format(d, "yyyy"), subtitle: "" };
  }
}
