import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { ChevronRight, Crown, Copy, Share2, LogOut, Camera, Trash2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { storage } from "@/lib/storage";
import { auth } from "@/lib/auth";
import { useLocalReactive } from "@/lib/hooks";
import { isPremium, setPremium, usePremium } from "@/lib/freemium";
import { getLanguage, setLanguage, SUPPORTED, type Lang, LANG_NAMES } from "@/lib/i18n";
import { getGroup, setGroup, clearGroup, randomCode, updateShared, encodeExport, decodeImport } from "@/lib/group";
import { PaywallModal } from "@/components/PaywallModal";
import { Avatar } from "@/components/Avatar";

export const Route = createFileRoute("/parametres")({
 component: Settings,
});


const PROGRAMS = ["bulk", "cut", "loss", "maintain"] as const;

function Settings() {
 const { t, i18n } = useTranslation();
 const nav = useNavigate();
 const user = useLocalReactive(() => storage.getUser());
 const sessionUser = useLocalReactive(() => storage.getSessionUser());
 const premium = usePremium();
 const group = useLocalReactive(() => getGroup());
 const [paywall, setPaywall] = useState(false);
 const [editingName, setEditingName] = useState(false);
 const [name, setName] = useState(user?.name ?? "");
 const [editingProgram, setEditingProgram] = useState(false);
 const [units, setUnits] = useState<"metric" | "imperial">(() => {
 if (typeof window === "undefined") return "metric";
 return (localStorage.getItem("fridgechef_units") as "metric" | "imperial") ?? "metric";
 });
 const photoInputRef = useRef<HTMLInputElement | null>(null);
 const [mounted, setMounted] = useState(false);
 useEffect(() => setMounted(true), []);

 // Group state
 const [joining, setJoining] = useState(false);
 const [joinCode, setJoinCode] = useState("");
 const [showExport, setShowExport] = useState(false);
 const [showImport, setShowImport] = useState(false);
 const [importCode, setImportCode] = useState("");

 if (!mounted || !user) {
 return (
 <div className="px-5 pt-8">
 <header className="mb-5">
 <h1 className="text-2xl font-bold">{t("settings.title")}</h1>
 </header>
 </div>
 );
 }

 const onPickPhoto = (file: File) => {
 if (!file.type.startsWith("image/")) {
 toast.error("Image invalide");
 return;
 }
 const reader = new FileReader();
 reader.onload = () => {
 const src = reader.result as string;
 const img = new Image();
 img.onload = () => {
 const max = 320;
 const scale = Math.min(1, max / Math.max(img.width, img.height));
 const w = Math.round(img.width * scale);
 const h = Math.round(img.height * scale);
 const canvas = document.createElement("canvas");
 canvas.width = w;
 canvas.height = h;
 const ctx = canvas.getContext("2d");
 if (!ctx) return;
 ctx.drawImage(img, 0, 0, w, h);
 const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
 storage.patchUser({ avatarPhoto: dataUrl });
 toast.success(t("settings.profileSaved"));
 };
 img.src = src;
 };
 reader.readAsDataURL(file);
 };

 const removePhoto = () => {
 storage.patchUser({ avatarPhoto: "" });
 };


 const saveName = () => {
 if (!name.trim()) return;
 storage.patchUser({ name: name.trim() });
 setEditingName(false);
 toast.success(t("settings.profileSaved"));
 };

 const setProgram = (slug: string) => {
 const map: Record<string, { name: string; kcal: number }> = {
 bulk: { name: t("program.bulk"), kcal: 2800 },
 cut: { name: t("program.cut"), kcal: 1900 },
 loss: { name: t("program.loss"), kcal: 1800 },
 maintain: { name: t("program.maintain"), kcal: 2200 },
 };
 const p = map[slug];
 if (!p) return;
 storage.patchUser({ program: p.name, dailyKcal: p.kcal });
 setEditingProgram(false);
 toast.success(t("settings.profileSaved"));
 };

 const toggleUnits = () => {
 const next = units === "metric" ? "imperial" : "metric";
 setUnits(next);
 localStorage.setItem("fridgechef_units", next);
 };

 const togglePremium = () => {
 const next = !isPremium();
 setPremium(next);
 toast(next ? t("settings.premiumOn") : t("settings.premiumOff"));
 };

 const createGroup = () => {
 setGroup({
 code: randomCode(),
 role: "owner",
 memberName: user.name,
 sharedData: { ingredients: [], planning: null, updatedAt: new Date().toISOString() },
 });
 toast.success(t("group.created"));
 };

 const joinGroupFn = () => {
 const c = joinCode.trim().toUpperCase();
 if (c.length !== 6) return toast.error(t("group.importError"));
 setGroup({
 code: c,
 role: "member",
 memberName: user.name,
 sharedData: { ingredients: [], planning: null, updatedAt: new Date().toISOString() },
 });
 setJoining(false);
 setJoinCode("");
 toast.success(t("group.joined"));
 };

 const copyCode = (code: string) => {
 navigator.clipboard.writeText(code).then(() => toast.success(t("group.codeCopied")));
 };

 const shareGroup = (code: string) => {
 const text = t("group.shareText", { code });
 const n = navigator as Navigator & { share?: (d: { text: string }) => Promise<void> };
 if (n.share) {
 n.share({ text }).catch(() => undefined);
 } else {
 navigator.clipboard.writeText(text).then(() => toast.success(t("common.copied")));
 }
 };

 const updateGroupIngredients = () => {
 updateShared({ ingredients: storage.getSession() });
 toast.success(t("common.copied"));
 };

 const sharePlanning = () => {
 updateShared({ planning: storage.getPlanning() });
 toast.success(t("common.copied"));
 };

 const doExport = () => {
 if (!group) return;
 setShowExport(true);
 };

 const doImport = () => {
 try {
 const g = decodeImport(importCode);
 setGroup(g);
 setShowImport(false);
 setImportCode("");
 toast.success(t("group.imported"));
 } catch {
 toast.error(t("group.importError"));
 }
 };

 const leaveGroup = () => {
 if (confirm(t("group.confirmLeave"))) {
 clearGroup();
 }
 };

 const exportData = () => {
 const data: Record<string, unknown> = {};
 ["fridgechef_user", "fridgechef_history", "fridgechef_favorites", "fridgechef_planning", "fridgechef_memory"].forEach(
 (k) => {
 try {
 const raw = localStorage.getItem(k);
 data[k] = raw ? JSON.parse(raw) : null;
 } catch {
 data[k] = null;
 }
 },
 );
 const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
 const url = URL.createObjectURL(blob);
 const a = document.createElement("a");
 a.href = url;
 a.download = "fridgechef-export.json";
 a.click();
 setTimeout(() => URL.revokeObjectURL(url), 1000);
 };

 return (
 <div className="px-5 pt-8">
 <header className="mb-5">
 <h1 className="text-2xl font-bold">{t("settings.title")}</h1>
 </header>

 {/* PROFILE HEADER CARD */}
 <div
 className="mb-6 flex items-center gap-4 rounded-3xl p-5"
 style={{
 background: "linear-gradient(135deg, #ffffff 0%, #E6FAF4 100%)",
 boxShadow: "0 6px 24px -12px rgba(45,212,168,0.35)",
 border: "1px solid rgba(45,212,168,0.18)",
 }}
 >
 <button
 type="button"
 onClick={() => photoInputRef.current?.click()}
 className="relative grid place-items-center transition active:scale-95"
 aria-label={t("settings.changePhoto")}
 >
 <Avatar
 name={user.name}
 id={sessionUser?.id ?? "guest"}
 size={72}
 color={user.avatarColor}
 photo={user.avatarPhoto || undefined}
 />
 <span
 className="absolute -bottom-1 -right-1 grid h-7 w-7 place-items-center rounded-full text-white"
 style={{
 background: "var(--primary)",
 boxShadow: "0 4px 10px rgba(45,212,168,0.45)",
 border: "2px solid white",
 }}
 >
 <Camera size={13} />
 </span>
 </button>
 <div className="min-w-0 flex-1">
 <p className="truncate text-base font-bold">{user.name}</p>
 {sessionUser?.email && (
 <p className="truncate text-xs text-muted-foreground">{sessionUser.email}</p>
 )}
 <p className="mt-1 text-[11px] font-semibold uppercase tracking-wider text-primary">
 {user.program}
 </p>
 </div>
 <input
 ref={photoInputRef}
 type="file"
 accept="image/*"
 className="hidden"
 onChange={(e) => {
 const f = e.target.files?.[0];
 if (f) onPickPhoto(f);
 e.target.value = "";
 }}
 />
 </div>

 {/* PROFILE */}
 <Section title={t("settings.profile")}>
 <Row label={t("settings.name")}>
 {editingName ? (
 <div className="flex gap-2">
 <input
 autoFocus
 value={name}
 onChange={(e) => setName(e.target.value)}
 onBlur={saveName}
 onKeyDown={(e) => e.key === "Enter" && saveName()}
 className="w-32 rounded-lg border border-input bg-background px-2 py-1 text-sm outline-none focus:border-primary"
 />
 </div>
 ) : (
 <button onClick={() => setEditingName(true)} className="text-sm text-muted-foreground">
 {user.name} <ChevronRight size={14} className="inline" />
 </button>
 )}
 </Row>
 <Row label={t("settings.currentProgram")}>
 <button
 onClick={() => setEditingProgram((v) => !v)}
 className="text-sm text-muted-foreground"
 >
 {user.program} <ChevronRight size={14} className="inline" />
 </button>
 </Row>
 {editingProgram && (
 <div className="border-t border-border bg-muted/30 p-3">
 <div className="grid grid-cols-2 gap-2">
 {PROGRAMS.map((p) => (
 <button
 key={p}
 onClick={() => setProgram(p)}
 className="rounded-xl border border-border bg-card px-3 py-2 text-xs font-semibold hover:border-primary"
 >
 {t(`program.${p}`)}
 </button>
 ))}
 </div>
 </div>
 )}
 <Row label={t("settings.profilePhoto")}>
 <div className="flex items-center gap-2">
 <button
 onClick={() => photoInputRef.current?.click()}
 className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary"
 >
 <Camera size={13} />
 {t("settings.changePhoto")}
 </button>
 {user.avatarPhoto && (
 <button
 onClick={removePhoto}
 className="grid h-8 w-8 place-items-center rounded-full bg-muted text-muted-foreground"
 aria-label={t("settings.removePhoto")}
 >
 <Trash2 size={13} />
 </button>
 )}
 </div>
 </Row>
 </Section>


 {/* PREFERENCES */}
 <Section title={t("settings.preferences")}>
 <Row label={t("settings.language")}>
 <select
 value={getLanguage()}
 onChange={(e) => {
 setLanguage(e.target.value as Lang);
 void i18n.changeLanguage(e.target.value);
 }}
 className="rounded-lg border border-input bg-background px-2 py-1 text-sm outline-none"
 >
 {SUPPORTED.map((l) => (
 <option key={l} value={l}>
 {t(`lang.${l}`)} · {LANG_NAMES[l]}
 </option>
 ))}
 </select>
 </Row>
 <Row label={t("settings.units")}>
 <button onClick={toggleUnits} className="text-sm text-primary">
 {units === "metric" ? t("settings.metric") : t("settings.imperial")}
 </button>
 </Row>
 </Section>


        {/* SUBSCRIPTION */}
        <Section title={t("settings.subscription")}>
          {premium ? (
            <div
              className="rounded-2xl p-[1.5px]"
              style={{
                background: "linear-gradient(135deg,#FCD34D,#D97706)",
              }}
            >
              <div
                className="flex items-center gap-3 rounded-[14px] px-4 py-3.5"
                style={{ background: "#FFFDF6" }}
              >
                <div
                  className="grid h-11 w-11 place-items-center rounded-2xl text-white"
                  style={{ background: "linear-gradient(135deg,#F59E0B,#D97706)" }}
                >
                  <Crown size={20} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[14px] font-extrabold" style={{ color: "#7C2D12" }}>
                    {t("settings.planActive")}
                  </p>
                  <p className="text-[11.5px] font-medium" style={{ color: "#92704A" }}>
                    Toutes les fonctionnalités débloquées
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setPaywall(true)}
              className="block w-full overflow-hidden rounded-2xl p-[1.5px] text-left transition active:scale-[0.99]"
              style={{
                background:
                  "linear-gradient(135deg,#FCD34D 0%,#F59E0B 45%,#B45309 100%)",
                boxShadow: "0 10px 30px -12px rgba(245,158,11,0.55)",
              }}
            >
              <div
                className="flex items-center gap-3 rounded-[14px] px-4 py-3.5"
                style={{
                  background:
                    "linear-gradient(135deg,#FFFDF6 0%,#FFF6E2 100%)",
                }}
              >
                <div
                  className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl text-white"
                  style={{ background: "linear-gradient(135deg,#F59E0B,#B45309)" }}
                >
                  <Crown size={20} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[14px] font-extrabold tracking-tight" style={{ color: "#0F1B17" }}>
                    Passer à Fridgy Pro
                  </p>
                  <p className="truncate text-[11.5px] font-medium" style={{ color: "#7C5A2A" }}>
                    Essai gratuit 14 jours · 3,89€/mois ou −23 % à l'année
                  </p>
                </div>
                <ChevronRight size={18} style={{ color: "#B45309" }} />
              </div>
            </button>
          )}
        </Section>

 {/* MY TRACKING */}
 <Section title={t("settings.tracking")}>
 <ButtonRow
 onClick={() => {
 if (typeof window !== "undefined") window.location.href = "/onboarding?edit=body";
 }}
 label="Modifier mon profil corporel"
 />
 <ButtonRow onClick={() => nav({ to: "/stats" })} label={t("settings.openStats")} />
 <ButtonRow onClick={() => nav({ to: "/historique" })} label={t("settings.openHistory")} />
 <ButtonRow onClick={() => nav({ to: "/planning" })} label={t("settings.openPlanning")} />
 <ButtonRow onClick={() => nav({ to: "/courses" })} label={t("settings.openShopping")} />
 </Section>

 {/* DATA */}
 <Section title={t("settings.data")}>
 <ButtonRow
 onClick={() => {
 if (confirm(t("settings.confirmClearHistory"))) storage.clearHistory();
 }}
 label={t("settings.clearHistory")}
 />
 <ButtonRow onClick={exportData} label={t("settings.exportData")} />
 <ButtonRow
 danger
 onClick={() => {
 if (confirm(t("settings.confirmReset"))) {
 storage.resetAll();
 nav({ to: "/onboarding" });
 }
 }}
 label={t("settings.reset")}
 />
 </Section>

 {/* ABOUT */}
 <Section title={t("settings.about")}>
 <Row label={t("settings.version")}>
 <span className="text-sm text-muted-foreground">3.0.0</span>
 </Row>
 <ButtonRow onClick={() => toast(t("paywall.soon"))} label={t("settings.rate")} />
 <a href="mailto:contact@fridgechef.app" className="block">
 <ButtonRow onClick={() => undefined} label={t("settings.contact")} />
 </a>
 </Section>

 <p className="mt-4 text-center text-[11px] text-muted-foreground">{t("settings.legal")}</p>

 <button
 onClick={togglePremium}
 className="mx-auto mt-4 block text-[11px] text-muted-foreground underline"
 >
 {t("settings.devMode")}
 </button>

 {/* LOGOUT */}
 {(() => {
 const sess = auth.getSession();
 if (!sess || sess.id === "guest") return null;
 return (
 <div className="mt-6 px-3">
 <div className="mb-3 flex items-center gap-3">
 <Avatar name={sess.prenom} id={sess.id} color={sess.avatarColor} photo={sess.avatarPhoto || undefined} size={40} />
 <div className="min-w-0 flex-1">
 <p className="truncate text-sm font-semibold">{sess.prenom}</p>
 {sess.email && (
 <p className="truncate text-xs text-muted-foreground">{sess.email}</p>
 )}
 </div>
 </div>
 <button
 onClick={async () => {
 if (
 confirm(
 `${t("auth.logoutConfirm")}\n\n${t("auth.logoutHint")}`,
 )
 ) {
 const { supabase } = await import("@/integrations/supabase/client");
 await supabase.auth.signOut();
 auth.clearSession();
 nav({ to: "/auth" });
 }
 }}
 className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-destructive/40 py-3 text-sm font-semibold text-destructive"
 >
 <LogOut size={15} /> {t("auth.logout")}
 </button>
 </div>
 );
 })()}

 {/* EXPORT MODAL */}
 {showExport && group && (
 <Modal onClose={() => setShowExport(false)} title={t("group.exportTitle")}>
 <textarea
 readOnly
 value={encodeExport(group)}
 className="h-32 w-full resize-none rounded-xl border border-input bg-muted p-3 font-mono text-[10px]"
 />
 <p className="mt-2 text-xs text-muted-foreground">{t("group.exportInstructions")}</p>
 <div className="mt-3 flex gap-2">
 <button
 onClick={() => {
 navigator.clipboard.writeText(encodeExport(group));
 toast.success(t("common.copied"));
 }}
 className="flex-1 rounded-full bg-primary py-2 text-sm font-semibold text-primary-foreground"
 >
 {t("common.copy")}
 </button>
 <a
 href={`https://wa.me/?text=${encodeURIComponent(encodeExport(group))}`}
 target="_blank"
 rel="noopener noreferrer"
 className="flex-1 rounded-full bg-emerald-600 py-2 text-center text-sm font-semibold text-white"
 >
 WhatsApp
 </a>
 </div>
 </Modal>
 )}

 {showImport && (
 <Modal onClose={() => setShowImport(false)} title={t("group.importBtn")}>
 <textarea
 autoFocus
 value={importCode}
 onChange={(e) => setImportCode(e.target.value)}
 placeholder={t("group.importPlaceholder")}
 className="h-32 w-full resize-none rounded-xl border border-input bg-background p-3 font-mono text-[10px]"
 />
 <button
 onClick={doImport}
 className="mt-3 w-full rounded-full bg-primary py-2.5 text-sm font-semibold text-primary-foreground"
 >
 {t("common.import")}
 </button>
 </Modal>
 )}

 <PaywallModal open={paywall} onClose={() => setPaywall(false)} />
 </div>
 );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
 return (
 <section className="mb-6">
 <h2 className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
 {title}
 </h2>
 <div className="fc-card divide-y divide-border overflow-hidden">{children}</div>
 </section>
 );
}

function Row({ label, children }: { label: React.ReactNode; children?: React.ReactNode }) {
 return (
 <div className="flex min-h-[52px] items-center justify-between gap-2 px-4 py-2.5">
 <span className="text-sm font-medium">{label}</span>
 <div>{children}</div>
 </div>
 );
}

function ButtonRow({
 label,
 onClick,
 danger,
}: {
 label: string;
 onClick: () => void;
 danger?: boolean;
}) {
 return (
 <button
 onClick={onClick}
 className={`flex min-h-[52px] w-full items-center justify-between px-4 py-2.5 text-left text-sm font-medium ${
 danger ? "text-destructive" : ""
 }`}
 >
 <span>{label}</span>
 <ChevronRight size={16} className="text-muted-foreground" />
 </button>
 );
}

function Modal({ children, title, onClose }: { children: React.ReactNode; title: string; onClose: () => void }) {
 return (
 <div className="fixed inset-0 z-[100] grid place-items-end bg-black/40" onClick={onClose}>
 <div
 onClick={(e) => e.stopPropagation()}
 className="w-full max-w-md animate-fade-up rounded-t-3xl bg-card p-5"
 style={{ paddingBottom: "calc(1.25rem + env(safe-area-inset-bottom))" }}
 >
 <div className="mb-3 flex items-center justify-between">
 <h3 className="font-semibold">{title}</h3>
 <button onClick={onClose} className="text-xs text-muted-foreground">
 
 </button>
 </div>
 {children}
 </div>
 </div>
 );
}
