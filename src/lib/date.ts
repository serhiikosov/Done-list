import {
  format,
  parseISO,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  startOfYear,
  isToday,
  isYesterday,
  isThisWeek,
  isThisYear,
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
