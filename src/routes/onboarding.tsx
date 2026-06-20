import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { storage } from "@/lib/storage";
import { auth } from "@/lib/auth";
import { setLanguage, type Lang, LANG_KEY } from "@/lib/i18n";
import {
 type ActivityLevel,
 type Sexe,
 ACTIVITY_MULTIPLIERS,
 cmToFtIn,
 computeBMR,
 computeIMC,
 computeTDEE,
 ftInToCm,
 getBodyProfile,
 imcCategory,
 kgToLbs,
 lbsToKg,
 setBodyProfile,
} from "@/lib/bodyProfile";

export const Route = createFileRoute("/onboarding")({
 component: Onboarding,
});

type Slug = "bulk" | "cut" | "loss" | "maintain";

const PROGRAMS: { slug: Slug; emoji: string; kcal: number }[] = [
 { slug: "bulk", emoji: "", kcal: 2800 },
 { slug: "cut", emoji: "", kcal: 1900 },
 { slug: "loss", emoji: "", kcal: 1800 },
 { slug: "maintain", emoji: "", kcal: 2200 },
];

const LANGS: { code: Lang; flag: string; name: string; cta: string }[] = [
 { code: "fr", flag: "", name: "Français", cta: "Continuer →" },
 { code: "en", flag: "", name: "English", cta: "Continue →" },
 { code: "es", flag: "", name: "Español", cta: "Continuar →" },
 { code: "pt", flag: "", name: "Português", cta: "Continuar →" },
 { code: "zh", flag: "", name: "中文", cta: "继续 →" },
];

type Step = "lang" | "auth" | "profile" | "program";

const ONBOARDING_DONE_KEY = "fridgechef_onboarding_complete";

function Onboarding() {
 const nav = useNavigate();
 const [ready, setReady] = useState(false);
 const [step, setStep] = useState<Step>("lang");
 const [pickedLang, setPickedLang] = useState<Lang | null>(null);
 const [editMode, setEditMode] = useState(false);

 useEffect(() => {
 if (typeof window === "undefined") return;

 // Edit mode: from Settings to update body profile only
 const params = new URLSearchParams(window.location.search);
 if (params.get("edit") === "body") {
 setEditMode(true);
 setStep("profile");
 setReady(true);
 return;
 }

 const done = localStorage.getItem(ONBOARDING_DONE_KEY) === "true";
 let sess = storage.getSessionUser();

 // Auto-restore single saved account when no session
 if (!sess) {
 const accs = auth.getAccounts();
 if (accs.length === 1) {
 const a = accs[0];
 auth.setSession({
 id: a.id,
 prenom: a.prenom,
 email: a.email,
 program: a.program,
 dailyKcal: a.dailyKcal,
 isPremium: a.isPremium,
 });
 sess = storage.getSessionUser();
 }
 }

 if (sess && sess.program && getBodyProfile()) {
 localStorage.setItem(ONBOARDING_DONE_KEY, "true");
 nav({ to: "/" });
 return;
 }
 if (done && sess) {
 nav({ to: "/" });
 return;
 }

 const stored = localStorage.getItem(LANG_KEY);
 const hasProfile = !!getBodyProfile();
 if (sess && !sess.program) {
 setStep(hasProfile ? "program" : "profile");
 } else if (stored) {
 setStep("auth");
 } else {
 setStep("lang");
 }
 setReady(true);
 }, [nav]);

 if (!ready) return <div style={{ minHeight: "100vh" }} />;

 const confirmLang = () => {
 if (!pickedLang) return;
 setLanguage(pickedLang);
 setStep("auth");
 };

 return (
 <div className="min-h-screen bg-background px-6 py-10">
 <div className="mx-auto max-w-sm">
 {step === "lang" && (
 <div className="animate-fade-up">
 <div className="mb-6 text-center">
 <div className="text-5xl"></div>
 <div className="mt-4 space-y-0.5 text-[13px] text-muted-foreground">
 <div>Choisissez votre langue</div>
 <div>Choose your language</div>
 <div>Elige tu idioma</div>
 <div>Escolha seu idioma</div>
 <div>选择您的语言</div>
 </div>
 </div>
 <div className="space-y-2.5">
 {LANGS.map((l) => {
 const selected = pickedLang === l.code;
 return (
 <button
 key={l.code}
 onClick={() => setPickedLang(l.code)}
 className="flex w-full items-center gap-3 bg-card px-4 transition active:scale-[0.98]"
 style={{
 height: 58,
 borderRadius: 14,
 border: selected ? "2px solid #4CAF82" : "1px solid var(--border)",
 boxShadow: "0 4px 20px rgba(0,0,0,0.04)",
 }}
 >
 <span style={{ fontSize: 32 }}>{l.flag}</span>
 <span className="flex-1 text-left text-[15px] font-medium">{l.name}</span>
 {selected && <span className="text-primary"></span>}
 </button>
 );
 })}
 </div>
 <button
 onClick={confirmLang}
 disabled={!pickedLang}
 className="mt-6 w-full rounded-full bg-primary py-3 text-sm font-semibold text-primary-foreground disabled:opacity-40"
 >
 {pickedLang ? LANGS.find((l) => l.code === pickedLang)!.cta : "Continuer →"}
 </button>
 </div>
 )}

 {step === "auth" && (
 <AuthScreen onAuthed={() => setStep("profile")} />
 )}

 {step === "profile" && (
 <BodyProfileScreen
 onDone={() => {
 if (editMode) {
 nav({ to: "/parametres" });
 } else {
 setStep("program");
 }
 }}
 />
 )}

 {step === "program" && (
 <ProgramScreen
 onDone={() => {
 if (typeof window !== "undefined") {
 localStorage.setItem(ONBOARDING_DONE_KEY, "true");
 }
 nav({ to: "/" });
 }}
 />
 )}
 </div>
 </div>
 );
}

function AuthScreen({ onAuthed }: { onAuthed: () => void }) {
 const { t } = useTranslation();
 const [mode, setMode] = useState<"register" | "login">("register");
 const [prenom, setPrenom] = useState("");
 const [email, setEmail] = useState("");
 const [pwd, setPwd] = useState("");
 const [pwd2, setPwd2] = useState("");
 const [showPwd, setShowPwd] = useState(false);
 const [touched, setTouched] = useState<Record<string, boolean>>({});
 const [globalError, setGlobalError] = useState<string | null>(null);

 const errors = {
 prenom: prenom.trim().length < 2 ? t("auth.errPrenom") : "",
 email: !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim()) ? t("auth.errEmail") : "",
 pwd: pwd.length < 6 ? t("auth.errPwd") : "",
 pwd2: pwd2 !== pwd ? t("auth.errPwd2") : "",
 };

 const registerValid = !errors.prenom && !errors.email && !errors.pwd && !errors.pwd2;
 const loginValid = !errors.email && !errors.pwd;

 const submitRegister = () => {
 setTouched({ prenom: true, email: true, pwd: true, pwd2: true });
 if (!registerValid) return;
 const r = auth.register(prenom, email, pwd);
 if (!r.ok) {
 setGlobalError(t("auth.exists"));
 return;
 }
 onAuthed();
 };

 const submitLogin = () => {
 setTouched({ email: true, pwd: true });
 if (!loginValid) return;
 const r = auth.login(email, pwd);
 if (!r.ok) {
 setGlobalError(t("auth.badCreds"));
 return;
 }
 // if already has program → home
 const sess = auth.getSession();
 if (sess?.program) {
 window.location.href = "/";
 } else {
 onAuthed();
 }
 };

 return (
 <div className="animate-fade-up">
 <div className="mb-6 text-center">
 <h1 className="text-2xl font-bold" style={{ fontFamily: "Inter, system-ui, sans-serif" }}>FridgeChef</h1>

 <p className="mt-1 text-sm text-muted-foreground">
 {mode === "register" ? t("auth.createTitle") : t("auth.loginTitle")}
 </p>
 </div>

 <div className="fc-card p-5">
 {mode === "register" && (
 <Field
 label={t("auth.prenom")}
 value={prenom}
 onChange={setPrenom}
 onBlur={() => setTouched((s) => ({ ...s, prenom: true }))}
 error={touched.prenom ? errors.prenom : ""}
 />
 )}
 <Field
 label="Email"
 type="email"
 value={email}
 onChange={(v) => {
 setEmail(v);
 setGlobalError(null);
 }}
 onBlur={() => setTouched((s) => ({ ...s, email: true }))}
 error={touched.email ? errors.email : ""}
 />
 <PasswordField
 label={t("auth.password")}
 value={pwd}
 onChange={(v) => {
 setPwd(v);
 setGlobalError(null);
 }}
 onBlur={() => setTouched((s) => ({ ...s, pwd: true }))}
 show={showPwd}
 onToggleShow={() => setShowPwd((v) => !v)}
 error={touched.pwd ? errors.pwd : ""}
 />
 {mode === "register" && (
 <PasswordField
 label={t("auth.password2")}
 value={pwd2}
 onChange={setPwd2}
 onBlur={() => setTouched((s) => ({ ...s, pwd2: true }))}
 show={showPwd}
 onToggleShow={() => setShowPwd((v) => !v)}
 error={touched.pwd2 ? errors.pwd2 : ""}
 />
 )}

 {globalError && (
 <p className="mt-2 text-xs font-medium" style={{ color: "#EF4444" }}>
 {globalError}
 </p>
 )}

 <button
 onClick={mode === "register" ? submitRegister : submitLogin}
 disabled={mode === "register" ? !registerValid : !loginValid}
 className="mt-5 w-full rounded-full bg-primary py-3 text-sm font-semibold text-primary-foreground disabled:opacity-40"
 >
 {mode === "register" ? t("auth.createCta") : t("auth.loginCta")}
 </button>

 {mode === "login" && (
 <button
 onClick={() => toast(t("auth.forgotSoon"))}
 className="mt-3 block w-full text-center text-xs text-muted-foreground"
 >
 {t("auth.forgot")}
 </button>
 )}

 <button
 onClick={() => {
 setMode(mode === "register" ? "login" : "register");
 setGlobalError(null);
 setTouched({});
 }}
 className="mt-4 block w-full text-center text-xs text-primary"
 >
 {mode === "register" ? t("auth.toLogin") : t("auth.toRegister")}
 </button>
 </div>
 </div>
 );
}

function ProgramScreen({ onDone }: { onDone: () => void }) {
 const { t } = useTranslation();
 const [program, setProgram] = useState<Slug | null>(null);

 const finish = () => {
 if (!program) return;
 const p = PROGRAMS.find((x) => x.slug === program)!;
 const programLabel = t(`program.${program}`);
 auth.updateSessionAndAccount({ program: programLabel, dailyKcal: p.kcal });
 // mirror to legacy User store for screens that still read it directly
 storage.patchUser({ program: programLabel, dailyKcal: p.kcal });
 onDone();
 };

 return (
 <div className="animate-fade-up">
 <div className="mb-6 text-center">
 <div className="text-5xl"></div>
 <h2 className="mt-3 text-lg font-semibold">{t("onboarding.programTitle")}</h2>
 <p className="mt-1 text-sm text-muted-foreground">{t("onboarding.programSub")}</p>
 </div>
 <div className="space-y-3">
 {PROGRAMS.map((p) => (
 <button
 key={p.slug}
 onClick={() => setProgram(p.slug)}
 className={`fc-card flex w-full items-center gap-4 p-4 text-left transition ${
 program === p.slug ? "ring-2 ring-primary" : ""
 }`}
 >
 <span className="text-2xl">{p.emoji}</span>
 <div className="flex-1">
 <div className="font-semibold">{t(`program.${p.slug}`)}</div>
 <div className="text-xs text-muted-foreground">
 {t(`program.${p.slug}Desc`)}
 </div>
 </div>
 
 </button>
 ))}
 </div>
 <button
 onClick={finish}
 disabled={!program}
 className="mt-6 w-full rounded-full bg-primary py-3 text-sm font-semibold text-primary-foreground disabled:opacity-40"
 >
 {t("onboarding.start")}
 </button>
 </div>
 );
}

function Field({
 label,
 value,
 onChange,
 onBlur,
 error,
 type = "text",
}: {
 label: string;
 value: string;
 onChange: (v: string) => void;
 onBlur?: () => void;
 error?: string;
 type?: string;
}) {
 return (
 <div className="mt-3">
 <label className="mb-1.5 block text-xs font-medium text-muted-foreground">{label}</label>
 <input
 type={type}
 value={value}
 onChange={(e) => onChange(e.target.value)}
 onBlur={onBlur}
 className="w-full bg-background px-4 text-[15px] outline-none"
 style={{
 height: 52,
 borderRadius: 12,
 border: `1.5px solid ${error ? "#EF4444" : "#E0E0E0"}`,
 }}
 onFocus={(e) => {
 if (!error) e.currentTarget.style.borderColor = "#4CAF82";
 }}
 />
 {error && (
 <p className="mt-1 text-xs" style={{ color: "#EF4444" }}>
 {error}
 </p>
 )}
 </div>
 );
}

function PasswordField({
 label,
 value,
 onChange,
 onBlur,
 show,
 onToggleShow,
 error,
}: {
 label: string;
 value: string;
 onChange: (v: string) => void;
 onBlur?: () => void;
 show: boolean;
 onToggleShow: () => void;
 error?: string;
}) {
 return (
 <div className="mt-3">
 <label className="mb-1.5 block text-xs font-medium text-muted-foreground">{label}</label>
 <div
 className="relative flex items-center bg-background"
 style={{
 height: 52,
 borderRadius: 12,
 border: `1.5px solid ${error ? "#EF4444" : "#E0E0E0"}`,
 }}
 >
 <input
 type={show ? "text" : "password"}
 value={value}
 onChange={(e) => onChange(e.target.value)}
 onBlur={onBlur}
 className="flex-1 bg-transparent px-4 text-[15px] outline-none"
 />
 <button
 type="button"
 onClick={onToggleShow}
 aria-label="Toggle password"
 className="mr-2 grid h-9 w-9 place-items-center text-muted-foreground"
 >
 {show ? <EyeOff size={18} /> : <Eye size={18} />}
 </button>
 </div>
 {error && (
 <p className="mt-1 text-xs" style={{ color: "#EF4444" }}>
 {error}
 </p>
 )}
 </div>
 );
}

// ============================================================
// Body Profile Screen
// ============================================================

const ACTIVITIES: { id: ActivityLevel; emoji: string; labelKey: string; subKey: string }[] = [
 { id: "sedentaire", emoji: "", labelKey: "body.actSed", subKey: "body.actSedSub" },
 { id: "leger", emoji: "", labelKey: "body.actLight", subKey: "body.actLightSub" },
 { id: "modere", emoji: "", labelKey: "body.actMod", subKey: "body.actModSub" },
 { id: "tres_actif", emoji: "", labelKey: "body.actHigh", subKey: "body.actHighSub" },
];

function BodyProfileScreen({ onDone }: { onDone: () => void }) {
 const { t } = useTranslation();
 const existing = useMemo(() => getBodyProfile(), []);

 const [age, setAge] = useState<string>(existing ? String(existing.age) : "");
 const [sexe, setSexe] = useState<Sexe | null>(existing?.sexe ?? null);

 const [heightUnit, setHeightUnit] = useState<"cm" | "ftin">("cm");
 const [tailleCm, setTailleCm] = useState<number>(existing?.tailleCm ?? 170);

 const [weightUnit, setWeightUnit] = useState<"kg" | "lbs">("kg");
 const [poidsKg, setPoidsKg] = useState<number>(existing?.poidsKg ?? 70);
 const [poidsObjectifKg, setPoidsObjectifKg] = useState<number>(
 existing?.poidsObjectifKg ?? existing?.poidsKg ?? 70,
 );

 const [activity, setActivity] = useState<ActivityLevel | null>(
 existing?.activityLevel ?? null,
 );

 const imc = computeIMC(poidsKg, tailleCm);
 const cat = imcCategory(imc);

 const ageNum = Number(age);
 const ageValid = ageNum >= 10 && ageNum <= 100;
 const valid = ageValid && !!sexe && !!activity && tailleCm > 0 && poidsKg > 0;

 const bmr = useMemo(
 () => (valid && sexe ? computeBMR(sexe, poidsKg, tailleCm, ageNum) : 0),
 [valid, sexe, poidsKg, tailleCm, ageNum],
 );
 const tdee = useMemo(
 () => (valid && activity ? computeTDEE(bmr, activity) : 0),
 [valid, activity, bmr],
 );

 const save = () => {
 if (!valid || !sexe || !activity) return;
 const _bmr = computeBMR(sexe, poidsKg, tailleCm, ageNum);
 const _tdee = computeTDEE(_bmr, activity);
 setBodyProfile({
 age: ageNum,
 sexe,
 tailleCm,
 poidsKg,
 poidsObjectifKg: poidsObjectifKg !== poidsKg ? poidsObjectifKg : null,
 imc,
 imcCategory: cat.key,
 activityLevel: activity,
 activityMultiplier: ACTIVITY_MULTIPLIERS[activity],
 bmr: _bmr,
 tdee: _tdee,
 updatedAt: new Date().toISOString(),
 });
 onDone();
 };

 const skip = () => {
 setBodyProfile(null);
 onDone();
 };

 const ftin = cmToFtIn(tailleCm);
 const poidsDisplay = weightUnit === "kg" ? poidsKg : kgToLbs(poidsKg);
 const objDisplay = weightUnit === "kg" ? poidsObjectifKg : kgToLbs(poidsObjectifKg);
 const wMin = weightUnit === "kg" ? 40 : 88;
 const wMax = weightUnit === "kg" ? 200 : 440;

 const setWeightFromUnit = (n: number) => {
 setPoidsKg(weightUnit === "kg" ? n : lbsToKg(n));
 };
 const setObjFromUnit = (n: number) => {
 setPoidsObjectifKg(weightUnit === "kg" ? n : lbsToKg(n));
 };

 return (
 <div className="animate-fade-up">
 {/* Progress */}
 <div className="mb-5 flex items-center gap-2">
 <div className="h-1.5 flex-1 rounded-full bg-secondary">
 <div className="h-full rounded-full bg-primary" style={{ width: "66%" }} />
 </div>
 <span className="text-[11px] font-medium text-muted-foreground">
 {t("body.stepOf", { current: 2, total: 3 })}
 </span>
 </div>

 <div className="mb-5">
 <h2 className="text-xl font-bold">{t("body.title")}</h2>
 <p className="mt-1 text-sm text-muted-foreground">{t("body.subtitle")}</p>
 </div>

 {/* SECTION 1 — age + sexe */}
 <div className="fc-card mb-3 p-4">
 <div className="grid grid-cols-2 gap-3">
 <div>
 <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
 {t("body.age")}
 </label>
 <div className="relative">
 <input
 type="number"
 min={10}
 max={100}
 value={age}
 onChange={(e) => setAge(e.target.value.replace(/[^0-9]/g, "").slice(0, 3))}
 placeholder="25"
 className="w-full bg-background pr-12 pl-4 text-[15px] outline-none"
 style={{ height: 48, borderRadius: 12, border: "1.5px solid #E0E0E0" }}
 />
 <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
 {t("body.years")}
 </span>
 </div>
 </div>
 <div>
 <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
 {t("body.sex")}
 </label>
 <div className="grid grid-cols-2 gap-2">
 <SexBtn active={sexe === "homme"} onClick={() => setSexe("homme")}>
 {t("body.male")}
 </SexBtn>
 <SexBtn active={sexe === "femme"} onClick={() => setSexe("femme")}>
 {t("body.female")}
 </SexBtn>
 </div>
 </div>
 </div>
 </div>

 {/* SECTION 2 — taille */}
 <div className="fc-card mb-3 p-4">
 <div className="mb-2 flex items-center justify-between">
 <label className="text-xs font-medium text-muted-foreground">{t("body.height")}</label>
 <UnitToggle
 left="cm"
 right="ft/in"
 value={heightUnit === "cm" ? "left" : "right"}
 onChange={(v) => setHeightUnit(v === "left" ? "cm" : "ftin")}
 />
 </div>

 {heightUnit === "cm" ? (
 <>
 <div className="flex items-center justify-between">
 <span className="text-lg font-bold">{tailleCm} cm</span>
 </div>
 <input
 type="range"
 min={140}
 max={220}
 value={tailleCm}
 onChange={(e) => setTailleCm(Number(e.target.value))}
 className="mt-2 w-full accent-primary"
 />
 </>
 ) : (
 <div className="flex items-center gap-3">
 <NumInput
 value={ftin.ft}
 min={4}
 max={7}
 onChange={(v) => setTailleCm(ftInToCm(v, ftin.inches))}
 unit="ft"
 />
 <NumInput
 value={ftin.inches}
 min={0}
 max={11}
 onChange={(v) => setTailleCm(ftInToCm(ftin.ft, v))}
 unit="in"
 />
 <span className="text-xs text-muted-foreground">
 = {tailleCm} cm
 </span>
 </div>
 )}
 </div>

 {/* SECTION 3 — poids actuel */}
 <div className="fc-card mb-3 p-4">
 <div className="mb-2 flex items-center justify-between">
 <label className="text-xs font-medium text-muted-foreground">
 {t("body.weight")}
 </label>
 <UnitToggle
 left="kg"
 right="lbs"
 value={weightUnit === "kg" ? "left" : "right"}
 onChange={(v) => setWeightUnit(v === "left" ? "kg" : "lbs")}
 />
 </div>
 <span className="text-lg font-bold">
 {poidsDisplay} {weightUnit}
 </span>
 <input
 type="range"
 min={wMin}
 max={wMax}
 value={poidsDisplay}
 onChange={(e) => setWeightFromUnit(Number(e.target.value))}
 className="mt-2 w-full accent-primary"
 />
 </div>

 {/* SECTION 5 — IMC */}
 <ImcCard imc={imc} cat={cat} t={t} />

 {/* SECTION 4 — poids objectif */}
 <div className="fc-card mb-3 p-4">
 <div className="mb-2 flex items-center justify-between">
 <label className="text-xs font-medium text-muted-foreground">
 {t("body.weightGoal")}
 <span
 className="ml-2 rounded-full px-2 py-0.5 text-[10px] font-semibold"
 style={{ background: "rgba(0,0,0,0.06)", color: "var(--muted-foreground)" }}
 >
 {t("body.optional")}
 </span>
 </label>
 <span className="text-[11px] text-muted-foreground">{weightUnit}</span>
 </div>
 <span className="text-lg font-bold">
 {objDisplay} {weightUnit}
 </span>
 <input
 type="range"
 min={wMin}
 max={wMax}
 value={objDisplay}
 onChange={(e) => setObjFromUnit(Number(e.target.value))}
 className="mt-2 w-full accent-primary"
 />
 </div>

 {/* SECTION 6 — activité */}
 <div className="fc-card mb-3 p-4">
 <label className="mb-2 block text-xs font-medium text-muted-foreground">
 {t("body.activity")}
 </label>
 <div className="grid grid-cols-2 gap-2">
 {ACTIVITIES.map((a) => {
 const active = activity === a.id;
 return (
 <button
 key={a.id}
 onClick={() => setActivity(a.id)}
 className="flex flex-col items-start gap-0.5 px-3 py-2.5 text-left transition active:scale-[0.98]"
 style={{
 borderRadius: 12,
 border: active ? "2px solid #4CAF82" : "1.5px solid #E0E0E0",
 background: active ? "#4CAF82" : "transparent",
 color: active ? "white" : "inherit",
 }}
 >
 <span className="text-sm font-semibold">
 {a.emoji} {t(a.labelKey)}
 </span>
 <span
 className="text-[11px]"
 style={{ color: active ? "rgba(255,255,255,0.85)" : "var(--muted-foreground)" }}
 >
 {t(a.subKey)}
 </span>
 </button>
 );
 })}
 </div>
 </div>

 {/* TDEE */}
 {valid && (
 <div
 className="mb-5 rounded-xl p-3 text-sm"
 style={{ background: "rgba(76,175,130,0.10)", borderLeft: "4px solid #4CAF82" }}
 >
 {t("body.tdee", { kcal: tdee })}
 </div>
 )}

 <button
 onClick={save}
 disabled={!valid}
 className="w-full rounded-full bg-primary py-3 text-sm font-semibold text-primary-foreground disabled:opacity-40"
 >
 {t("common.continue")}
 </button>
 <button
 onClick={skip}
 className="mt-3 block w-full text-center text-xs text-muted-foreground"
 >
 {t("body.skip")}
 </button>
 </div>
 );
}

function SexBtn({
 active,
 onClick,
 children,
}: {
 active: boolean;
 onClick: () => void;
 children: React.ReactNode;
}) {
 return (
 <button
 onClick={onClick}
 className="text-sm font-semibold transition active:scale-[0.98]"
 style={{
 height: 48,
 borderRadius: 12,
 border: active ? "2px solid #4CAF82" : "1.5px solid #E0E0E0",
 background: active ? "#4CAF82" : "transparent",
 color: active ? "white" : "inherit",
 }}
 >
 {children}
 </button>
 );
}

function UnitToggle({
 left,
 right,
 value,
 onChange,
}: {
 left: string;
 right: string;
 value: "left" | "right";
 onChange: (v: "left" | "right") => void;
}) {
 return (
 <div
 className="flex items-center text-[11px] font-semibold"
 style={{ background: "rgba(0,0,0,0.05)", borderRadius: 999, padding: 2 }}
 >
 {(["left", "right"] as const).map((side) => {
 const active = value === side;
 return (
 <button
 key={side}
 onClick={() => onChange(side)}
 style={{
 padding: "4px 10px",
 borderRadius: 999,
 background: active ? "white" : "transparent",
 color: active ? "#4CAF82" : "var(--muted-foreground)",
 boxShadow: active ? "0 1px 4px rgba(0,0,0,0.08)" : undefined,
 }}
 >
 {side === "left" ? left : right}
 </button>
 );
 })}
 </div>
 );
}

function NumInput({
 value,
 min,
 max,
 onChange,
 unit,
}: {
 value: number;
 min: number;
 max: number;
 onChange: (v: number) => void;
 unit: string;
}) {
 return (
 <div className="relative">
 <input
 type="number"
 min={min}
 max={max}
 value={value}
 onChange={(e) => {
 const n = Math.max(min, Math.min(max, Number(e.target.value) || min));
 onChange(n);
 }}
 className="w-20 bg-background pl-3 pr-8 text-[15px] outline-none"
 style={{ height: 44, borderRadius: 10, border: "1.5px solid #E0E0E0" }}
 />
 <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
 {unit}
 </span>
 </div>
 );
}

function ImcCard({
 imc,
 cat,
 t,
}: {
 imc: number;
 cat: { key: "maigreur" | "normal" | "surpoids" | "obesite"; color: string };
 t: (k: string) => string;
}) {
 // position 0..100 for cursor on bar
 const pct = Math.max(0, Math.min(100, ((imc - 15) / (35 - 15)) * 100));
 const segs = [
 { key: "maigreur", color: "#3B82F6" },
 { key: "normal", color: "#4CAF82" },
 { key: "surpoids", color: "#F59E0B" },
 { key: "obesite", color: "#EF4444" },
 ];
 return (
 <div className="fc-card mb-3 p-4">
 <div className="flex items-end justify-between">
 <div>
 <div className="text-xs font-medium text-muted-foreground">{t("body.yourImc")}</div>
 <div
 className="text-[28px] font-bold leading-none"
 style={{ color: cat.color }}
 >
 {imc || "—"}
 </div>
 </div>
 <div
 className="rounded-full px-3 py-1 text-xs font-semibold"
 style={{ background: cat.color + "22", color: cat.color }}
 >
 {t(`body.imc.${cat.key}`)}
 </div>
 </div>
 <div className="relative mt-3 h-2 overflow-hidden rounded-full">
 <div className="absolute inset-0 flex">
 {segs.map((s) => (
 <div key={s.key} className="h-full flex-1" style={{ background: s.color }} />
 ))}
 </div>
 <div
 className="absolute top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow"
 style={{ left: `${pct}%`, background: cat.color }}
 />
 </div>
 <div className="mt-1 flex justify-between text-[10px] text-muted-foreground">
 <span>{t("body.imc.maigreur")}</span>
 <span>{t("body.imc.normal")}</span>
 <span>{t("body.imc.surpoids")}</span>
 <span>{t("body.imc.obesite")}</span>
 </div>
 <p className="mt-3 text-xs text-muted-foreground">
 {t(`body.imc.msg.${cat.key}`)}
 </p>
 </div>
 );
}
