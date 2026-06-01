export interface ReminderConfig {
  enabled: boolean;
  time: string; // "HH:MM" local
}

const KEY = "done-list:reminder";
const FIRED_KEY = "done-list:reminded-on";

export function loadReminder(): ReminderConfig {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const c = JSON.parse(raw);
      if (typeof c?.enabled === "boolean" && typeof c?.time === "string") return c;
    }
  } catch {
    /* ignore */
  }
  return { enabled: false, time: "17:30" };
}

export function saveReminder(c: ReminderConfig) {
  localStorage.setItem(KEY, JSON.stringify(c));
}

export function firedToday(todayKey: string): boolean {
  return localStorage.getItem(FIRED_KEY) === todayKey;
}

export function markFired(todayKey: string) {
  localStorage.setItem(FIRED_KEY, todayKey);
}

/** Fire a notification through the service worker (best for installed PWAs),
 *  falling back to a plain Notification. */
export async function notify(title: string, body: string) {
  if (!("Notification" in window) || Notification.permission !== "granted") return;
  try {
    if ("serviceWorker" in navigator) {
      const reg = await navigator.serviceWorker.ready;
      await reg.showNotification(title, { body, icon: "./pwa-192x192.png", tag: "done-reminder" });
      return;
    }
  } catch {
    /* fall through */
  }
  try {
    new Notification(title, { body });
  } catch {
    /* ignore */
  }
}
