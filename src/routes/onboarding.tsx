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
  { slug: "bulk", emoji: "💪", kcal: 2800 },
  { slug: "cut", emoji: "🔥", kcal: 1900 },
  { slug: "loss", emoji: "⚖️", kcal: 1800 },
  { slug: "maintain", emoji: "🎯", kcal: 2200 },
];

const LANGS: { code: Lang; flag: string; name: string; cta: string }[] = [
  { code: "fr", flag: "🇫🇷", name: "Français", cta: "Continuer →" },
  { code: "en", flag: "🇬🇧", name: "English", cta: "Continue →" },
  { code: "es", flag: "🇪🇸", name: "Español", cta: "Continuar →" },
  { code: "pt", flag: "🇧🇷", name: "Português", cta: "Continuar →" },
  { code: "zh", flag: "🇨🇳", name: "中文", cta: "继续 →" },
];

type Step = "lang" | "auth" | "profile" | "program";

function Onboarding() {
  const nav = useNavigate();
  const [ready, setReady] = useState(false);
  const [step, setStep] = useState<Step>("lang");
  const [pickedLang, setPickedLang] = useState<Lang | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const sess = storage.getSessionUser();
    if (sess && sess.program) {
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
              <div className="text-5xl">🌍</div>
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
                    {selected && <span className="text-primary">✓</span>}
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
          <BodyProfileScreen onDone={() => setStep("program")} />
        )}

        {step === "program" && (
          <ProgramScreen onDone={() => nav({ to: "/" })} />
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
        <div className="text-5xl">🥦</div>
        <h1 className="mt-3 text-2xl font-bold">FridgeChef</h1>
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
        <div className="text-5xl">🎯</div>
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
            <span className="text-xs text-muted-foreground">{p.kcal} kcal</span>
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
