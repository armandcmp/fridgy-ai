import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/reset-password")({
  component: ResetPassword,
});

function ResetPassword() {
  const nav = useNavigate();
  const [ready, setReady] = useState(false);
  const [pwd, setPwd] = useState("");
  const [pwd2, setPwd2] = useState("");
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Supabase parses recovery tokens from the URL hash automatically.
    // We just need to wait for a session to exist.
    const check = async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        // Listen for the recovery event
        const { data: sub } = supabase.auth.onAuthStateChange((event) => {
          if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") {
            setReady(true);
          }
        });
        // Give it a moment
        setTimeout(() => {
          supabase.auth.getSession().then(({ data }) => {
            if (data.session) setReady(true);
          });
        }, 500);
        return () => sub.subscription.unsubscribe();
      }
      setReady(true);
    };
    check();
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pwd.length < 6) return toast.error("Au moins 6 caractères");
    if (pwd !== pwd2) return toast.error("Les mots de passe ne correspondent pas");
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password: pwd });
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("Mot de passe mis à jour !");
    nav({ to: "/", replace: true });
  };

  return (
    <div className="px-5 pb-20 pt-12">
      <div className="mb-8 text-center">
        <h1 className="text-[28px] font-extrabold tracking-tight" style={{ color: "#0F172A" }}>
          Nouveau mot de passe
        </h1>
        <p className="mt-1 text-[13.5px] text-muted-foreground">
          {ready ? "Choisissez un nouveau mot de passe" : "Vérification du lien…"}
        </p>
      </div>

      {ready && (
        <form
          onSubmit={submit}
          className="mx-auto max-w-md space-y-3 rounded-3xl border bg-card p-5"
          style={{ borderColor: "var(--border)", boxShadow: "var(--shadow-card)" }}
        >
          <PwdField label="Nouveau mot de passe" value={pwd} onChange={setPwd} show={show} onToggle={() => setShow((v) => !v)} />
          <PwdField label="Confirmer" value={pwd2} onChange={setPwd2} show={show} onToggle={() => setShow((v) => !v)} />
          <button
            type="submit"
            disabled={loading}
            className="mt-2 w-full rounded-2xl py-3 text-[14px] font-extrabold text-primary-foreground transition active:scale-[0.99] disabled:opacity-60"
            style={{ background: "var(--primary)" }}
          >
            {loading ? "Patientez…" : "Mettre à jour"}
          </button>
        </form>
      )}
    </div>
  );
}

function PwdField({
  label,
  value,
  onChange,
  show,
  onToggle,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  show: boolean;
  onToggle: () => void;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-[12px] font-semibold text-muted-foreground">{label}</span>
      <div className="relative">
        <input
          type={show ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          required
          minLength={6}
          placeholder="••••••••"
          className="w-full rounded-xl border bg-card px-3 py-2.5 pr-11 text-[14px] outline-none transition focus:border-primary"
          style={{ borderColor: "var(--border)" }}
        />
        <button
          type="button"
          onClick={onToggle}
          className="absolute right-2 top-1/2 -translate-y-1/2 grid h-8 w-8 place-items-center rounded-lg text-muted-foreground"
        >
          {show ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      </div>
    </label>
  );
}
