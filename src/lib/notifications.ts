import { storage } from "./storage";

export function notifSupported(): boolean {
  return typeof window !== "undefined" && "Notification" in window;
}

export function notifPermission(): NotificationPermission | "unsupported" {
  if (!notifSupported()) return "unsupported";
  return Notification.permission;
}

export async function requestNotifPermission(): Promise<NotificationPermission> {
  if (!notifSupported()) return "denied";
  const p = await Notification.requestPermission();
  const n = storage.getNotif();
  storage.setNotif({ ...n, enabled: p === "granted", lastPromptAt: new Date().toISOString() });
  return p;
}

export function shouldShowPermissionPrompt(): boolean {
  if (!notifSupported()) return false;
  if (Notification.permission !== "default") return false;
  const n = storage.getNotif();
  if (!n.lastPromptAt) return true;
  const last = new Date(n.lastPromptAt).getTime();
  const threeDays = 3 * 24 * 60 * 60 * 1000;
  return Date.now() - last > threeDays;
}

export function deferPrompt() {
  const n = storage.getNotif();
  storage.setNotif({ ...n, lastPromptAt: new Date().toISOString() });
}

function sendNotif(title: string, body: string) {
  if (!notifSupported() || Notification.permission !== "granted") return;
  try {
    new Notification(title, { body, icon: "/favicon.ico" });
  } catch {
    // ignore
  }
}

let mealTimer: ReturnType<typeof setTimeout> | null = null;
let weeklyTimer: ReturnType<typeof setTimeout> | null = null;

export function scheduleMealReminder() {
  if (mealTimer) clearTimeout(mealTimer);
  const n = storage.getNotif();
  if (!n.enabled || !n.mealReminder) return;
  const [h, m] = n.mealTime.split(":").map(Number);
  const now = new Date();
  const next = new Date();
  next.setHours(h, m, 0, 0);
  if (next <= now) next.setDate(next.getDate() + 1);
  const ms = next.getTime() - now.getTime();
  mealTimer = setTimeout(() => {
    sendNotif(
      "FridgeChef",
      "🍽 C'est l'heure de cuisiner ! Qu'est-ce qu'il y a dans votre frigo aujourd'hui ?",
    );
    scheduleMealReminder();
  }, ms);
}

export function scheduleWeeklyReminder() {
  if (weeklyTimer) clearTimeout(weeklyTimer);
  const n = storage.getNotif();
  if (!n.enabled || !n.planningReminder) return;
  const now = new Date();
  const next = new Date(now);
  const day = next.getDay(); // 0=Sun, 1=Mon
  const daysUntilMon = (1 - day + 7) % 7 || 7;
  next.setDate(now.getDate() + daysUntilMon);
  next.setHours(9, 0, 0, 0);
  const ms = next.getTime() - now.getTime();
  weeklyTimer = setTimeout(() => {
    sendNotif("FridgeChef", "📅 Nouvelle semaine ! Votre planning de repas vous attend.");
    scheduleWeeklyReminder();
  }, ms);
}

export function maybeStreakNotification() {
  const n = storage.getNotif();
  if (!n.enabled || !n.streakReminder) return;
  const hist = storage.getHistory();
  const days = new Set(
    hist.slice(0, 30).map((h) => new Date(h.date).toDateString()),
  );
  let streak = 0;
  for (let i = 0; i < 10; i++) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    if (days.has(d.toDateString())) streak++;
    else break;
  }
  if (streak === 3) {
    sendNotif("FridgeChef", "🔥 3 jours de suite ! Continuez comme ça !");
  }
}

export function initNotifications() {
  scheduleMealReminder();
  scheduleWeeklyReminder();
}
