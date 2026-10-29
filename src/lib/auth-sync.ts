import { supabase } from "@/integrations/supabase/client";
import { storage } from "@/lib/storage";
import { activateAccount, currentOwner, accountPayload } from "@/lib/account-cache";
import { toast } from "sonner";
import type { CurrentUser } from "@/lib/types";
const SESSION_KEY = "fridgechef_session_user";
let generation = 0;
let identity: string | null = null;
let hydrated: string | null = null;
let inFlight: Promise<CurrentUser | null> | null = null;
let pushTimer: ReturnType<typeof setTimeout> | null = null;
let dataTimer: ReturnType<typeof setTimeout> | null = null;
let uploadRunning = false;
const syncKey = (id: string) => `fridgy_sync:${id}`;
type Sync = { revision: number; edit: number; dirty: boolean; profileDirty?: boolean; profile?: CurrentUser };
function syncState(id: string): Sync { try { return JSON.parse(localStorage.getItem(syncKey(id)) ?? '{"revision":0,"edit":0,"dirty":false}'); } catch { return { revision: 0, edit: 0, dirty: false }; } }
function saveState(id: string, state: Sync) { localStorage.setItem(syncKey(id), JSON.stringify(state)); }
export function observeIdentity(id: string | null) {
  if (id !== identity) { generation++; identity = id; hydrated = null; inFlight = null; if (pushTimer) clearTimeout(pushTimer); if (dataTimer) clearTimeout(dataTimer); activateAccount(id); }
}
export async function hydrateFromProfile(): Promise<CurrentUser | null> {
  const { data } = await supabase.auth.getUser();
  if (!data.user) return null;
  observeIdentity(data.user.id);
  if (hydrated === data.user.id) return storage.getSessionUser();
  if (inFlight) return inFlight;
  const user = data.user; const version = generation; const edits = syncState(user.id).edit;
  const work = async () => {
    const [profileResult, payloadResult] = await Promise.all([
      supabase.from("profiles").select("prenom,program,daily_kcal,avatar_photo").eq("id", user.id).maybeSingle(),
      supabase.from("account_data").select("payload,revision").eq("user_id", user.id).maybeSingle(),
    ]);
    if (profileResult.error) throw new Error(profileResult.error.message);
    if (payloadResult.error) throw new Error(payloadResult.error.message);
    if (version !== generation || identity !== user.id) return null;
    const state = syncState(user.id);
    if (!state.dirty && state.edit === edits && payloadResult.data) {
      activateAccount(user.id, payloadResult.data.payload as Record<string, string>);
      state.revision = payloadResult.data.revision;
    }
    const profile = profileResult.data;
    const next: CurrentUser = state.profileDirty && state.profile ? state.profile : {
      id: user.id, prenom: profile?.prenom || user.user_metadata?.prenom || user.email?.split("@")[0] || "Fridgy",
      email: user.email ?? null, program: profile?.program ?? null, dailyKcal: profile?.daily_kcal ?? null, isPremium: false, avatarPhoto: profile?.avatar_photo ?? undefined,
    };
    if (version !== generation) return null;
    saveState(user.id, state); localStorage.setItem(SESSION_KEY, JSON.stringify(next)); hydrated = user.id;
    window.dispatchEvent(new CustomEvent("fridgechef:change", { detail: "*" }));
    if (state.dirty) schedulePushData(false);
    if (state.profileDirty) schedulePushProfile(false);
    return next;
  };
  const promise = work(); inFlight = promise;
  try { return await promise; } finally { if (inFlight === promise) inFlight = null; }
}
export function schedulePushProfile(mark = true) {
  const id = currentOwner(); if (!id) return;
  if (mark) { const state = syncState(id); state.profileDirty = true; state.profile = storage.getSessionUser() ?? undefined; saveState(id, state); }
  if (pushTimer) clearTimeout(pushTimer);
  pushTimer = setTimeout(() => { void pushProfile().catch(e => toast.error(String(e))); }, 400);
}
export async function pushProfile() {
  const sess = storage.getSessionUser(); const version = generation;
  if (!sess || identity !== sess.id) return;
  const { data } = await supabase.auth.getUser();
  if (data.user?.id !== sess.id || generation !== version) return;
  const { error } = await supabase.from("profiles").upsert({ id: sess.id, prenom: sess.prenom, program: sess.program, daily_kcal: sess.dailyKcal, avatar_photo: sess.avatarPhoto ?? null }, { onConflict: "id" });
  if (error) { toast.error(error.message); throw error; }
  const state = syncState(sess.id);
  if (JSON.stringify(state.profile) === JSON.stringify(sess)) { state.profileDirty = false; saveState(sess.id, state); }
}
export function schedulePushData(mark = true) {
  const id = currentOwner(); if (!id) return;
  const state = syncState(id); if (mark) { state.edit++; state.dirty = true; saveState(id, state); }
  if (dataTimer) clearTimeout(dataTimer);
  dataTimer = setTimeout(() => { void uploadData().catch(e => toast.error(String(e))); }, 500);
}
async function uploadData() {
  if (uploadRunning) return;
  uploadRunning = true;
  try {
    const id = currentOwner(); const version = generation; if (!id) return;
    while (currentOwner() === id && generation === version) {
      const state = syncState(id); if (!state.dirty) break;
      const payload = accountPayload();
      const { data: auth } = await supabase.auth.getUser(); if (auth.user?.id !== id || generation !== version) return;
      const { data: revision, error } = await supabase.rpc("save_account_data", { p_revision: state.revision, p_payload: payload });
      if (error) throw new Error(error.message.includes("SYNC_CONFLICT") ? "Cloud sync conflict: local changes are preserved. Reload before retrying." : error.message);
      const latest = syncState(id); latest.revision = revision; latest.dirty = latest.edit !== state.edit; saveState(id, latest);
    }
  } finally { uploadRunning = false; }
}
export function clearLocalSession() { observeIdentity(null); activateAccount(null); localStorage.removeItem(SESSION_KEY); window.dispatchEvent(new CustomEvent("fridgechef:change", { detail: "*" })); }
