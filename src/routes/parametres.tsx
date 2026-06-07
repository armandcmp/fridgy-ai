import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { ChevronRight, Copy, Crown, Share2, Trash2, Users } from "lucide-react";
import { storage, AVATAR_COLORS } from "@/lib/storage";
import { useLocalReactive } from "@/lib/hooks";
import { LANGUAGES, setLanguage, getLanguage, type LangCode } from "@/lib/i18n";
import { isPremium, setPremium, usePremium } from "@/lib/usage";
import { Paywall } from "@/components/Paywall";
import {
  groupStore,
  generateCode,
  encodeGroup,
  decodeGroup,
  type GroupData,
} from "@/lib/group";
import type { Program } from "@/lib/types";

export const Route = createFileRoute("/parametres")({
  component: Settings,
});

const PROGRAMS: { key: string; name: Program; emoji: string; kcal: number }[] = [
  { key: "bulk", name: "Prise de masse", emoji: "💪", kcal: 2800 },
  { key: "cut", name: "Sèche", emoji: "🔥", kcal: 1900 },
  { key: "loss", name: "Perte de poids", emoji: "⚖️", kcal: 1800 },
  { key: "balance", name: "Équilibre", emoji: "🥗", kcal: 2200 },
  { key: "pleasure", name: "Plaisir", emoji: "🍕", kcal: 2400 },
];

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-6">
      <h2 className="mb-2 px-1 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
        {title}
      </h2>
      <div className="fc-card divide-y divide-border overflow-hidden p-0">{children}</div>
    </section>
  );
}

function Row({
  children,
  onClick,
  right,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  right?: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      disabled={!onClick}
      className="flex w-full items-center justify-between px-4 py-3.5 text-left text-sm transition active:bg-muted/50 disabled:cursor-default"
      style={{ minHeight: 52 }}
    >
      <span>{children}</span>
      <span className="flex items-center gap-2 text-muted-foreground">
        {right} {onClick && <ChevronRight size={16} />}
      </span>
    </button>
  );
}

function Settings() {
  const { t, i18n } = useTranslation();
  const nav = useNavigate();
  const user = useLocalReactive(() => storage.getUser());
  const group = useLocalReactive(() => groupStore.get());
  const units = useLocalReactive(() => storage.getUnits());
  const premium = usePremium();
  const [name, setName] = useState(user?.name ?? "");
  const [progPicker, setProgPicker] = useState(false);
  const [colorPicker, setColorPicker] = useState(false);
  const [langPicker, setLangPicker] = useState(false);
  const [paywall, setPaywall] = useState(false);
  const [joinOpen, setJoinOpen] = useState(false);
  const [joinCode, setJoinCode] = useState("");
  const [memberName, setMemberName] = useState(user?.name ?? "");
  const [exportOpen, setExportOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [importText, setImportText] = useState("");

  if (!user) {
    nav({ to: "/onboarding" });
    return null;
  }

  const saveName = () => {
    if (!name.trim()) return;
    storage.setUser({ ...user, name: name.trim() });
    toast.success("✓");
  };
  const pickProgram = (p: (typeof PROGRAMS)[number]) => {
    storage.setUser({ ...user, program: p.name, dailyKcal: p.kcal });
    setProgPicker(false);
  };
  const pickColor = (hex: string) => {
    storage.setUser({ ...user, avatarColor: hex });
    setColorPicker(false);
  };
  const pickLang = (code: LangCode) => {
    setLanguage(code);
    setLangPicker(false);
  };

  // Group actions
  const createGroup = () => {
    const code = generateCode();
    const g: GroupData = {
      code,
      role: "owner",
      memberName: user.name,
      sharedData: { ingredients: storage.getSession(), planning: null, updatedAt: new Date().toISOString() },
    };
    groupStore.set(g);
    toast.success(`Groupe ${code} créé`);
  };
  const joinGroup = () => {
    if (joinCode.trim().length !== 6) { toast.error("Code à 6 caractères"); return; }
    const g: GroupData = {
      code: joinCode.trim().toUpperCase(),
      role: "member",
      memberName: memberName || user.name,
      sharedData: { ingredients: [], planning: null, updatedAt: new Date().toISOString() },
    };
    groupStore.set(g);
    setJoinOpen(false);
    setJoinCode("");
    toast.success(t("group.imported"));
  };
  const leaveGroup = () => {
    if (!confirm(t("group.leaveConfirm"))) return;
    groupStore.clear();
  };
  const updateGroupIngredients = () => {
    if (!group) return;
    groupStore.set({
      ...group,
      sharedData: {
        ...group.sharedData,
        ingredients: storage.getSession(),
        updatedAt: new Date().toISOString(),
      },
    });
    toast.success("✓");
  };
  const shareGroupPlanning = () => {
    if (!group) return;
    groupStore.set({
      ...group,
      sharedData: {
        ...group.sharedData,
        planning: storage.getPlanning(),
        updatedAt: new Date().toISOString(),
      },
    });
    toast.success("✓");
  };
  const exportCode = () =>
    group ? encodeGroup({ code: group.code, ...group.sharedData }) : "";
  const doImport = () => {
    if (!group) return;
    const data = decodeGroup(importText);
    if (!data) { toast.error("Code invalide"); return; }
    groupStore.set({
      ...group,
      sharedData: {
        ingredients: data.ingredients,
        planning: data.planning,
        updatedAt: data.updatedAt ?? new Date().toISOString(),
      },
    });
    setImportOpen(false);
    setImportText("");
    toast.success(t("group.imported"));
  };
  const shareGroupCode = async () => {
    if (!group) return;
    const text = t("group.shareMsg", { code: group.code });
    const n = navigator as Navigator;
    if (n.share) {
      try { await n.share({ title: "FridgeChef", text }); return; } catch { /* ignore */ }
    }
    await navigator.clipboard.writeText(text);
    toast.success("Copié ✓");
  };

  // Data actions
  const clearHistory = () => {
    if (!confirm(t("settings.clearConfirm"))) return;
    storage.clearHistory();
    toast.success("✓");
  };
  const resetApp = () => {
    if (!confirm(t("settings.resetConfirm"))) return;
    storage.resetAll();
    nav({ to: "/onboarding" });
  };
  const exportData = () => {
    const data = storage.exportAll();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "fridgechef-export.json";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const togglePremium = () => {
    const next = !isPremium();
    setPremium(next);
    toast(next ? t("settings.premiumOn") : t("settings.premiumOff"));
  };

  const currentLang = LANGUAGES.find((l) => l.code === (i18n.language ?? getLanguage()));

  return (
    <div className="px-5 pt-8">
      <header className="mb-5">
        <h1 className="text-2xl font-bold">{t("settings.title")}</h1>
      </header>

      <Section title={t("settings.profile")}>
        <div className="px-4 py-3">
          <label className="text-xs text-muted-foreground">{t("settings.firstName")}</label>
          <div className="mt-1 flex gap-2">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="flex-1 rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary"
            />
            <button onClick={saveName} className="rounded-lg bg-primary px-3 text-xs font-semibold text-primary-foreground">
              {t("common.save")}
            </button>
          </div>
        </div>
        <Row onClick={() => setProgPicker(true)} right={<span className="text-sm">{user.program}</span>}>
          {t("settings.program")}
        </Row>
        <Row onClick={() => setColorPicker(true)} right={
          <span className="h-5 w-5 rounded-full border border-border" style={{ background: user.avatarColor ?? "#4CAF82" }} />
        }>
          {t("settings.avatarColor")}
        </Row>
      </Section>

      <Section title={t("settings.preferences")}>
        <Row onClick={() => setLangPicker(true)} right={
          <span className="text-sm">{currentLang?.flag} {currentLang?.name}</span>
        }>
          {t("settings.language")}
        </Row>
        <div className="flex items-center justify-between px-4 py-3.5 text-sm" style={{ minHeight: 52 }}>
          <span>{t("settings.units")}</span>
          <div className="flex overflow-hidden rounded-full bg-muted text-xs">
            <button
              onClick={() => storage.setUnits("metric")}
              className={`px-3 py-1 ${units === "metric" ? "bg-primary text-primary-foreground" : ""}`}
            >
              g/kg
            </button>
            <button
              onClick={() => storage.setUnits("imperial")}
              className={`px-3 py-1 ${units === "imperial" ? "bg-primary text-primary-foreground" : ""}`}
            >
              oz/lb
            </button>
          </div>
        </div>
      </Section>

      <Section title={t("settings.group")}>
        {!group ? (
          <>
            <Row onClick={createGroup}><Users size={14} className="mr-2 inline" /> {t("group.create")}</Row>
            <Row onClick={() => setJoinOpen(true)}>{t("group.join")}</Row>
          </>
        ) : (
          <>
            <div className="px-4 py-3">
              <p className="text-xs text-muted-foreground">{t("group.codeLabel")}</p>
              <div className="mt-1 flex items-center gap-2">
                <span className="text-2xl font-bold tracking-widest">{group.code}</span>
                <button
                  onClick={() => { navigator.clipboard.writeText(group.code); toast.success("✓"); }}
                  className="grid h-8 w-8 place-items-center rounded-full bg-muted"
                >
                  <Copy size={14} />
                </button>
                <button
                  onClick={shareGroupCode}
                  className="grid h-8 w-8 place-items-center rounded-full bg-muted"
                >
                  <Share2 size={14} />
                </button>
              </div>
            </div>
            <div className="px-4 py-3">
              <p className="text-sm font-semibold">{t("group.sharedIngredients")}</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {group.sharedData.ingredients.length === 0 ? (
                  <span className="text-xs text-muted-foreground">—</span>
                ) : (
                  group.sharedData.ingredients.map((i, k) => (
                    <span key={k} className="rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">{i}</span>
                  ))
                )}
              </div>
              <button onClick={updateGroupIngredients} className="mt-3 w-full rounded-full border border-primary py-2 text-xs font-semibold text-primary">
                {t("group.update")}
              </button>
            </div>
            <div className="px-4 py-3">
              <p className="text-sm font-semibold">{t("group.sharedPlanning")}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {group.sharedData.planning ? "✓" : "—"}
              </p>
              <button onClick={shareGroupPlanning} className="mt-2 w-full rounded-full border border-primary py-2 text-xs font-semibold text-primary">
                {t("group.sharePlanning")}
              </button>
            </div>
            <Row onClick={() => setExportOpen(true)}>{t("group.export")}</Row>
            <Row onClick={() => setImportOpen(true)}>{t("group.import")}</Row>
            <Row onClick={leaveGroup} right={<Trash2 size={14} className="text-destructive" />}>
              <span className="text-destructive">{t("group.leave")}</span>
            </Row>
          </>
        )}
      </Section>

      <Section title={t("settings.subscription")}>
        <div className="flex items-center justify-between px-4 py-3.5">
          <span className="text-sm font-semibold">
            {premium ? t("settings.planPro") : t("settings.planFree")}
          </span>
          {!premium ? (
            <button
              onClick={() => setPaywall(true)}
              className="rounded-full px-4 py-2 text-xs font-bold text-white"
              style={{ background: "linear-gradient(135deg, #F59E0B, #D97706)" }}
            >
              {t("settings.upgrade")}
            </button>
          ) : (
            <Crown size={18} className="text-amber-500" />
          )}
        </div>
      </Section>

      <Section title={t("settings.data")}>
        <Row onClick={clearHistory}>{t("settings.clearHistory")}</Row>
        <Row onClick={exportData}>{t("settings.export")}</Row>
        <Row onClick={resetApp}>
          <span className="text-destructive">{t("settings.reset")}</span>
        </Row>
      </Section>

      <Section title={t("settings.about")}>
        <Row right={<span className="text-xs">{t("settings.version")}</span>}>FridgeChef</Row>
        <Row onClick={() => toast("⭐")}>{t("settings.rate")}</Row>
        <Row onClick={() => { window.location.href = "mailto:contact@fridgechef.app"; }}>
          {t("settings.contact")}
        </Row>
        <div className="px-4 py-3 text-[11px] text-muted-foreground">{t("settings.legal")}</div>
      </Section>

      <button onClick={togglePremium} className="mx-auto mb-6 block text-[11px] text-muted-foreground underline">
        {t("settings.devMode")}
      </button>

      {/* Modals */}
      {progPicker && (
        <Modal onClose={() => setProgPicker(false)} title={t("settings.program")}>
          <div className="space-y-2">
            {PROGRAMS.map((p) => (
              <button
                key={p.name}
                onClick={() => pickProgram(p)}
                className={`flex w-full items-center gap-3 rounded-xl p-3 text-left text-sm ${
                  user.program === p.name ? "bg-primary/10 ring-2 ring-primary" : "bg-muted/40"
                }`}
              >
                <span className="text-xl">{p.emoji}</span>
                <span className="flex-1">{t(`program.${p.key}`)}</span>
                <span className="text-xs text-muted-foreground">{p.kcal} kcal</span>
              </button>
            ))}
          </div>
        </Modal>
      )}

      {colorPicker && (
        <Modal onClose={() => setColorPicker(false)} title={t("settings.avatarColor")}>
          <div className="flex justify-around">
            {AVATAR_COLORS.map((c) => (
              <button
                key={c}
                onClick={() => pickColor(c)}
                className={`h-12 w-12 rounded-full transition ${user.avatarColor === c ? "ring-4 ring-primary" : ""}`}
                style={{ background: c }}
              />
            ))}
          </div>
        </Modal>
      )}

      {langPicker && (
        <Modal onClose={() => setLangPicker(false)} title={t("settings.language")}>
          <div className="space-y-2">
            {LANGUAGES.map((l) => (
              <button
                key={l.code}
                onClick={() => pickLang(l.code)}
                className={`flex w-full items-center gap-3 rounded-xl p-3 text-left text-sm ${
                  i18n.language === l.code ? "bg-primary/10 ring-2 ring-primary" : "bg-muted/40"
                }`}
              >
                <span className="text-xl">{l.flag}</span>
                <span>{l.name}</span>
              </button>
            ))}
          </div>
        </Modal>
      )}

      {joinOpen && (
        <Modal onClose={() => setJoinOpen(false)} title={t("group.join")}>
          <input
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
            placeholder={t("group.joinPlaceholder")}
            maxLength={6}
            className="w-full rounded-xl border border-input bg-background px-4 py-3 text-center text-xl font-bold tracking-widest outline-none focus:border-primary"
          />
          <input
            value={memberName}
            onChange={(e) => setMemberName(e.target.value)}
            placeholder={t("onboarding.namePlaceholder")}
            className="mt-3 w-full rounded-xl border border-input bg-background px-4 py-3 text-sm outline-none focus:border-primary"
          />
          <button
            onClick={joinGroup}
            className="mt-4 w-full rounded-full bg-primary py-3 text-sm font-semibold text-primary-foreground"
          >
            {t("common.confirm")}
          </button>
        </Modal>
      )}

      {exportOpen && group && (
        <Modal onClose={() => setExportOpen(false)} title={t("group.export")}>
          <p className="text-xs text-muted-foreground">{t("group.exportHint")}</p>
          <textarea
            readOnly
            value={exportCode()}
            className="mt-3 h-32 w-full resize-none rounded-xl border border-input bg-muted/30 p-3 text-xs"
          />
          <div className="mt-3 flex gap-2">
            <button
              onClick={() => { navigator.clipboard.writeText(exportCode()); toast.success("✓"); }}
              className="flex-1 rounded-full bg-primary py-2.5 text-xs font-semibold text-primary-foreground"
            >
              {t("common.copy")}
            </button>
            <button
              onClick={() => {
                const url = `https://wa.me/?text=${encodeURIComponent(exportCode())}`;
                window.open(url, "_blank", "noopener,noreferrer");
              }}
              className="flex-1 rounded-full bg-[#25D366] py-2.5 text-xs font-semibold text-white"
            >
              WhatsApp
            </button>
          </div>
        </Modal>
      )}

      {importOpen && (
        <Modal onClose={() => setImportOpen(false)} title={t("group.import")}>
          <textarea
            value={importText}
            onChange={(e) => setImportText(e.target.value)}
            placeholder={t("group.importPlaceholder")}
            className="h-32 w-full resize-none rounded-xl border border-input bg-background p-3 text-xs outline-none focus:border-primary"
          />
          <button
            onClick={doImport}
            className="mt-3 w-full rounded-full bg-primary py-3 text-sm font-semibold text-primary-foreground"
          >
            {t("common.confirm")}
          </button>
        </Modal>
      )}

      <Paywall open={paywall} onClose={() => setPaywall(false)} />
    </div>
  );
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-[100] bg-black/40" onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="absolute bottom-0 left-0 right-0 mx-auto max-w-md animate-paywall-up rounded-t-3xl bg-card p-5"
        style={{ paddingBottom: "calc(1.25rem + env(safe-area-inset-bottom))" }}
      >
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-semibold">{title}</h3>
          <button onClick={onClose} className="text-xs text-muted-foreground">✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}
