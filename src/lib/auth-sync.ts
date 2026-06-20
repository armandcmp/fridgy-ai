import { supabase } from "@/integrations/supabase/client";
import { storage } from "@/lib/storage";
import type { CurrentUser } from "@/lib/types";

const SESSION_KEY = "fridgechef_session_user";

/**
 * Pull profile row from the database and write it into local session storage,
 * so the rest of the app (which reads from storage) just works.
 * Returns the resulting CurrentUser, or null if no auth user.
 */
export async function hydrateFromProfile(): Promise<CurrentUser | null> {
  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("prenom, program, daily_kcal, avatar_photo, is_premium")
    .eq("id", user.id)
    .maybeSingle();

  const meta = (user.user_metadata ?? {}) as Record<string, string | undefined>;
  const prenomFallback =
    meta.prenom || meta.name || meta.full_name || user.email?.split("@")[0] || "Toi";

  const next: CurrentUser = {
    id: user.id,
    prenom: profile?.prenom || prenomFallback,
    email: user.email ?? null,
    program: profile?.program ?? null,
    dailyKcal: profile?.daily_kcal ?? null,
    isPremium: profile?.is_premium ?? false,
    avatarPhoto: profile?.avatar_photo ?? undefined,
  };

  if (typeof window !== "undefined") {
    localStorage.setItem(SESSION_KEY, JSON.stringify(next));
    window.dispatchEvent(new CustomEvent("fridgechef:change", { detail: SESSION_KEY }));
  }
  return next;
}

let pushTimer: ReturnType<typeof setTimeout> | null = null;

/**
 * Push the current localStorage session user to the database (debounced).
 * Safe to call repeatedly.
 */
export function schedulePushProfile() {
  if (typeof window === "undefined") return;
  if (pushTimer) clearTimeout(pushTimer);
  pushTimer = setTimeout(() => void pushProfile(), 400);
}

export async function pushProfile() {
  const sess = storage.getSessionUser();
  if (!sess || sess.id === "guest") return;
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user || userData.user.id !== sess.id) return;

  await supabase.from("profiles").upsert(
    {
      id: sess.id,
      prenom: sess.prenom,
      program: sess.program,
      daily_kcal: sess.dailyKcal,
      avatar_photo: sess.avatarPhoto ?? null,
      is_premium: sess.isPremium,
    },
    { onConflict: "id" },
  );
}

/** Wipe local session/profile-related storage on sign out. */
export function clearLocalSession() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(SESSION_KEY);
  localStorage.removeItem("fridgechef_user");
  window.dispatchEvent(new CustomEvent("fridgechef:change", { detail: SESSION_KEY }));
}
