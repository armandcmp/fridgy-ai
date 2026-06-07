import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { ChevronRight, Crown, Copy, Share2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { storage } from "@/lib/storage";
import { useLocalReactive } from "@/lib/hooks";
import { isPremium, setPremium, usePremium } from "@/lib/freemium";
import { getLanguage, setLanguage, SUPPORTED, type Lang, LANG_NAMES } from "@/lib/i18n";
import { getGroup, setGroup, clearGroup, randomCode, updateShared, encodeExport, decodeImport } from "@/lib/group";
import { PaywallModal } from "@/components/PaywallModal";

export const Route = createFileRoute("/parametres")({
  component: Settings,
});

const PROGRAMS = ["bulk", "cut", "loss", "balance", "pleasure"] as const;
const COLORS = ["#4CAF82", "#F59E0B", "#EF4444", "#3B82F6", "#A855F7", "#EC4899"];

function Settings() {
  const { t, i18n } = useTranslation();
  const nav = useNavigate();
  const user = useLocalReactive(() => storage.getUser());
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

  // Group state
  const [joining, setJoining] = useState(false);
  const [joinCode, setJoinCode] = useState("");
  const [showExport, setShowExport] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [importCode, setImportCode] = useState("");

  if (!user) {
    return (
      <div className="px-5 pt-8">
        <p className="text-sm text-muted-foreground">…</p>
      </div>
    );
  }

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
      balance: { name: t("program.balance"), kcal: 2200 },
      pleasure: { name: t("program.pleasure"), kcal: 2500 },
    };
    const p = map[slug];
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
        <Row label={t("settings.avatarColor")}>
          <div className="flex gap-1.5">
            {COLORS.map((c) => (
              <button
                key={c}
                onClick={() => storage.patchUser({ avatarColor: c })}
                className={`h-6 w-6 rounded-full ${user.avatarColor === c ? "ring-2 ring-offset-2 ring-foreground" : ""}`}
                style={{ background: c }}
              />
            ))}
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

      {/* GROUP */}
      <Section title={t("settings.group")}>
        {!group ? (
          <div className="p-4 space-y-2">
            <button
              onClick={createGroup}
              className="w-full rounded-full bg-primary py-2.5 text-sm font-semibold text-primary-foreground"
            >
              {t("group.create")}
            </button>
            {!joining ? (
              <button
                onClick={() => setJoining(true)}
                className="w-full rounded-full border border-primary py-2.5 text-sm font-semibold text-primary"
              >
                {t("group.join")}
              </button>
            ) : (
              <div className="flex gap-2">
                <input
                  autoFocus
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value.toUpperCase().slice(0, 6))}
                  placeholder={t("group.codeInput")}
                  className="flex-1 rounded-full border border-input bg-background px-3 py-2 text-sm tracking-widest outline-none focus:border-primary"
                />
                <button
                  onClick={joinGroupFn}
                  className="rounded-full bg-primary px-4 text-sm font-semibold text-primary-foreground"
                >
                  OK
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="p-4 space-y-3">
            <div className="flex items-center justify-between gap-2 rounded-xl bg-muted/40 p-3">
              <span className="font-mono text-xl font-bold tracking-widest">{group.code}</span>
              <div className="flex gap-1">
                <button
                  onClick={() => copyCode(group.code)}
                  className="grid h-8 w-8 place-items-center rounded-full bg-card"
                  aria-label={t("common.copy")}
                >
                  <Copy size={14} />
                </button>
                <button
                  onClick={() => shareGroup(group.code)}
                  className="grid h-8 w-8 place-items-center rounded-full bg-card"
                  aria-label={t("common.share")}
                >
                  <Share2 size={14} />
                </button>
              </div>
            </div>

            <div className="rounded-xl border border-border p-3">
              <p className="text-xs font-semibold">{t("group.shared")}</p>
              {group.sharedData.ingredients.length > 0 ? (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {group.sharedData.ingredients.slice(0, 12).map((i) => (
                    <span key={i} className="rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">
                      {i}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="mt-1 text-xs text-muted-foreground">{t("group.nothingShared")}</p>
              )}
              <button
                onClick={updateGroupIngredients}
                className="mt-3 w-full rounded-full bg-secondary py-2 text-xs font-semibold text-secondary-foreground"
              >
                {t("group.updateShared")}
              </button>
            </div>

            <div className="rounded-xl border border-border p-3">
              <p className="text-xs font-semibold">{t("group.sharedPlanning")}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {group.sharedData.planning
                  ? `${group.sharedData.planning.days.filter((d) => d.recette).length} / 7`
                  : t("group.nothingShared")}
              </p>
              <button
                onClick={sharePlanning}
                className="mt-3 w-full rounded-full bg-secondary py-2 text-xs font-semibold text-secondary-foreground"
              >
                {t("group.sharePlanning")}
              </button>
            </div>

            <div className="rounded-xl border border-border p-3">
              <p className="text-xs font-semibold">{t("group.sync")}</p>
              <div className="mt-2 grid grid-cols-2 gap-2">
                <button
                  onClick={doExport}
                  className="rounded-full border border-border py-2 text-[11px] font-semibold"
                >
                  {t("group.exportBtn")}
                </button>
                <button
                  onClick={() => setShowImport(true)}
                  className="rounded-full border border-border py-2 text-[11px] font-semibold"
                >
                  {t("group.importBtn")}
                </button>
              </div>
            </div>

            <button
              onClick={leaveGroup}
              className="w-full rounded-full border border-destructive py-2.5 text-sm font-semibold text-destructive"
            >
              {t("group.leave")}
            </button>
          </div>
        )}
      </Section>

      {/* SUBSCRIPTION */}
      <Section title={t("settings.subscription")}>
        <Row
          label={
            <span className="inline-flex items-center gap-1">
              {premium ? (
                <>
                  <Crown size={14} className="text-amber-500" /> {t("settings.planActive")}
                </>
              ) : (
                t("settings.planFree")
              )}
            </span>
          }
        >
          {!premium ? (
            <button
              onClick={() => setPaywall(true)}
              className="rounded-full px-3 py-1.5 text-xs font-bold text-white"
              style={{ background: "linear-gradient(135deg, #F59E0B, #D97706)" }}
            >
              {t("settings.upgrade")}
            </button>
          ) : (
            <span className="text-sm font-semibold text-amber-500">👑</span>
          )}
        </Row>
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
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
