import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { hydrateFromProfile } from "@/lib/auth-sync";

export const Route = createFileRoute("/auth")({
  component: AuthScreen,
});

type Mode = "signin" | "signup";

function AuthScreen() {
  const nav = useNavigate();
  const [mode, setMode] = useState<Mode>("signin");
  const [prenom, setPrenom] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [forgotOpen, setForgotOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotLoading, setForgotLoading] = useState(false);
  const [loading, setLoading] = useState(false);

  // Already signed in? Skip the screen.
  useEffect(() => {
    let active = true;
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (active && data.session) {
        const u = await hydrateFromProfile();
        nav({ to: u?.program ? "/" : "/onboarding", replace: true });
      }
    })();
    return () => {
      active = false;
    };
  }, [nav]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "signup") {
        if (password !== confirmPassword) {
          throw new Error("Les mots de passe ne correspondent pas");
        }
        const { error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            emailRedirectTo: window.location.origin,
            data: { prenom: prenom.trim() || email.split("@")[0] },
          },
        });
        if (error) throw error;
        const u = await hydrateFromProfile();
        toast.success("Compte créé !");
        nav({ to: u?.program ? "/" : "/onboarding", replace: true });
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (error) throw error;
        const u = await hydrateFromProfile();
        toast.success(`Bon retour, ${u?.prenom ?? ""} !`);
        nav({ to: u?.program ? "/" : "/onboarding", replace: true });
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erreur inconnue";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const google = async () => {
    setLoading(true);
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (result.error) {
      toast.error("Connexion Google impossible");
      setLoading(false);
      return;
    }
    if (result.redirected) return;
    const u = await hydrateFromProfile();
    nav({ to: u?.program ? "/" : "/onboarding", replace: true });
  };

  const sendReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail.trim()) return;
    setForgotLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(forgotEmail.trim(), {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setForgotLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Email envoyé ! Vérifiez votre boîte de réception.");
    setForgotOpen(false);
    setForgotEmail("");
  };

  return (
    <div className="px-5 pb-20 pt-12">
      <div className="mb-8 text-center">
        <h1 className="text-[34px] font-extrabold tracking-tight" style={{ color: "#0F172A" }}>
          Fridgy
        </h1>
        <p className="mt-1 text-[13.5px] text-muted-foreground">
          {mode === "signup" ? "Créez votre compte" : "Connectez-vous à votre compte"}
        </p>
      </div>

      <div
        className="mx-auto max-w-md rounded-3xl border bg-card p-5"
        style={{ borderColor: "var(--border)", boxShadow: "var(--shadow-card)" }}
      >
        <div className="mb-4 grid grid-cols-2 gap-1 rounded-full bg-muted p-1 text-[13px] font-semibold">
          {(["signin", "signup"] as Mode[]).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              className="rounded-full py-2 transition"
              style={{
                background: mode === m ? "var(--card)" : "transparent",
                color: mode === m ? "var(--primary)" : "var(--muted-foreground)",
                boxShadow: mode === m ? "var(--shadow-card)" : "none",
              }}
            >
              {m === "signin" ? "Connexion" : "Inscription"}
            </button>
          ))}
        </div>

        <form onSubmit={submit} className="space-y-3">
          {mode === "signup" && (
            <Field
              label="Prénom"
              value={prenom}
              onChange={setPrenom}
              placeholder="Alex"
              autoComplete="given-name"
            />
          )}
          <Field
            label="Email"
            type="email"
            value={email}
            onChange={setEmail}
            placeholder="vous@exemple.com"
            autoComplete="email"
            required
          />
          <PasswordField
            label="Mot de passe"
            value={password}
            onChange={setPassword}
            visible={showPassword}
            onToggle={() => setShowPassword((v) => !v)}
            autoComplete={mode === "signup" ? "new-password" : "current-password"}
            minLength={6}
          />
          {mode === "signup" && (
            <PasswordField
              label="Confirmer le mot de passe"
              value={confirmPassword}
              onChange={setConfirmPassword}
              visible={showConfirm}
              onToggle={() => setShowConfirm((v) => !v)}
              autoComplete="new-password"
              minLength={6}
            />
          )}

          <button
            type="submit"
            disabled={loading}
            className="mt-2 w-full rounded-2xl py-3 text-[14px] font-extrabold text-primary-foreground transition active:scale-[0.99] disabled:opacity-60"
            style={{ background: "var(--primary)" }}
          >
            {loading
              ? "Patientez…"
              : mode === "signup"
                ? "Créer mon compte"
                : "Se connecter"}
          </button>
        </form>

        {mode === "signin" && (
          <div className="mt-3 text-center">
            <button
              type="button"
              onClick={() => {
                setForgotEmail(email);
                setForgotOpen((v) => !v);
              }}
              className="text-[12.5px] font-semibold text-primary hover:underline"
            >
              Mot de passe oublié ?
            </button>
          </div>
        )}

        {forgotOpen && mode === "signin" && (
          <form
            onSubmit={sendReset}
            className="mt-3 rounded-2xl border p-3"
            style={{ borderColor: "var(--border)", background: "var(--muted)" }}
          >
            <p className="mb-2 text-[12px] text-muted-foreground">
              Entrez votre email, nous vous enverrons un lien pour réinitialiser votre mot de passe.
            </p>
            <input
              type="email"
              required
              value={forgotEmail}
              onChange={(e) => setForgotEmail(e.target.value)}
              placeholder="vous@exemple.com"
              className="w-full rounded-xl border bg-card px-3 py-2.5 text-[14px] outline-none focus:border-primary"
              style={{ borderColor: "var(--border)" }}
            />
            <button
              type="submit"
              disabled={forgotLoading}
              className="mt-2 w-full rounded-xl py-2.5 text-[13px] font-extrabold text-primary-foreground disabled:opacity-60"
              style={{ background: "var(--primary)" }}
            >
              {forgotLoading ? "Envoi…" : "Envoyer le lien"}
            </button>
          </form>
        )}

        <div className="my-4 flex items-center gap-3 text-[11px] uppercase tracking-wider text-muted-foreground">
          <span className="h-px flex-1 bg-border" />
          ou
          <span className="h-px flex-1 bg-border" />
        </div>

        <button
          type="button"
          onClick={google}
          disabled={loading}
          className="flex w-full items-center justify-center gap-2 rounded-2xl border bg-card py-3 text-[14px] font-semibold transition active:scale-[0.99] disabled:opacity-60"
          style={{ borderColor: "var(--border)" }}
        >
          <GoogleIcon />
          Continuer avec Google
        </button>
      </div>

      <p className="mt-6 text-center text-[11.5px] text-muted-foreground">
        En continuant, vous acceptez nos conditions d'utilisation.
      </p>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  ...rest
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, "value" | "onChange">) {
  return (
    <label className="block">
      <span className="mb-1 block text-[12px] font-semibold text-muted-foreground">{label}</span>
      <input
        {...rest}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl border bg-card px-3 py-2.5 text-[14px] outline-none transition focus:border-primary"
        style={{ borderColor: "var(--border)" }}
      />
    </label>
  );
}

function PasswordField({
  label,
  value,
  onChange,
  visible,
  onToggle,
  autoComplete,
  minLength,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  visible: boolean;
  onToggle: () => void;
  autoComplete?: string;
  minLength?: number;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-[12px] font-semibold text-muted-foreground">{label}</span>
      <div className="relative">
        <input
          type={visible ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="••••••••"
          autoComplete={autoComplete}
          required
          minLength={minLength}
          className="w-full rounded-xl border bg-card px-3 py-2.5 pr-11 text-[14px] outline-none transition focus:border-primary"
          style={{ borderColor: "var(--border)" }}
        />
        <button
          type="button"
          onClick={onToggle}
          aria-label={visible ? "Masquer le mot de passe" : "Afficher le mot de passe"}
          className="absolute right-2 top-1/2 -translate-y-1/2 grid h-8 w-8 place-items-center rounded-lg text-muted-foreground transition hover:text-foreground"
        >
          {visible ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      </div>
    </label>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden>
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.6-6 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.5 6.1 29.5 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.2-.1-2.3-.4-3.5z"/>
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 16 19 13 24 13c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.5 6.1 29.5 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/>
      <path fill="#4CAF50" d="M24 44c5.3 0 10.2-2 13.9-5.3l-6.4-5.4C29.5 35 26.9 36 24 36c-5.3 0-9.7-3.4-11.3-8L6 32.6C9.3 39.4 16.1 44 24 44z"/>
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.3 4.2-4.2 5.5l6.4 5.4C41.2 36.2 44 30.6 44 24c0-1.2-.1-2.3-.4-3.5z"/>
    </svg>
  );
}
