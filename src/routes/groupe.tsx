import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft, Users, Copy, Share2, UserPlus, Sparkles } from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { storage } from "@/lib/storage";
import { useLocalReactive } from "@/lib/hooks";
import {
  getGroup,
  setGroup,
  clearGroup,
  randomCode,
  updateShared,
  encodeExport,
  decodeImport,
} from "@/lib/group";

export const Route = createFileRoute("/groupe")({
  component: GroupPage,
});

function GroupPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const group = useLocalReactive(() => getGroup());
  const user = useLocalReactive(() => storage.getUser());

  const [mode, setMode] = useState<"home" | "join">("home");
  const [joinCode, setJoinCode] = useState("");
  const [showExport, setShowExport] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [importCode, setImportCode] = useState("");

  const createGroup = () => {
    if (!user) return;
    setGroup({
      code: randomCode(),
      role: "owner",
      memberName: user.name,
      sharedData: { ingredients: [], planning: null, updatedAt: new Date().toISOString() },
    });
    toast.success(t("group.created"));
  };

  const joinGroupFn = () => {
    if (!user) return;
    const c = joinCode.trim().toUpperCase();
    if (c.length !== 6) return toast.error(t("group.importError"));
    setGroup({
      code: c,
      role: "member",
      memberName: user.name,
      sharedData: { ingredients: [], planning: null, updatedAt: new Date().toISOString() },
    });
    setMode("home");
    setJoinCode("");
    toast.success(t("group.joined"));
  };

  const copyCode = (code: string) =>
    navigator.clipboard.writeText(code).then(() => toast.success(t("group.codeCopied")));

  const shareGroup = (code: string) => {
    const text = t("group.shareText", { code });
    const n = navigator as Navigator & { share?: (d: { text: string }) => Promise<void> };
    if (n.share) n.share({ text }).catch(() => undefined);
    else navigator.clipboard.writeText(text).then(() => toast.success(t("common.copied")));
  };

  const updateGroupIngredients = () => {
    updateShared({ ingredients: storage.getSession() });
    toast.success(t("common.copied"));
  };

  const sharePlanning = () => {
    updateShared({ planning: storage.getPlanning() });
    toast.success(t("common.copied"));
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
    if (confirm(t("group.confirmLeave"))) clearGroup();
  };

  return (
    <div className="min-h-screen bg-white pb-24">
      <header className="sticky top-0 z-10 flex items-center gap-3 border-b border-neutral-100 bg-white/90 px-4 py-3 backdrop-blur">
        <button
          onClick={() => navigate({ to: "/" })}
          className="grid h-9 w-9 place-items-center rounded-full bg-neutral-100 text-neutral-700"
          aria-label="back"
        >
          <ArrowLeft size={18} />
        </button>
        <h1 className="text-[17px] font-extrabold tracking-tight" style={{ color: "#0F1B17" }}>
          {t("group.title")}
        </h1>
      </header>

      <main className="mx-auto max-w-md px-4 py-5">
        {!group ? (
          mode === "home" ? (
            <div className="space-y-4">
              <div
                className="rounded-3xl p-5 text-white"
                style={{ background: "linear-gradient(135deg,#2DD4A8 0%,#10B981 100%)" }}
              >
                <div className="grid h-12 w-12 place-items-center rounded-2xl bg-white/20 backdrop-blur">
                  <Users size={22} strokeWidth={2.4} />
                </div>
                <h2 className="mt-3 text-[20px] font-extrabold tracking-tight">
                  {t("group.title")}
                </h2>
                <p className="mt-1 text-[13px] leading-snug text-white/90">
                  Partagez votre frigo, vos courses et votre planning avec vos colocataires ou votre famille.
                </p>
              </div>

              <button
                onClick={createGroup}
                className="flex w-full items-center gap-3 rounded-3xl border border-emerald-100 bg-white p-4 text-left transition active:scale-[0.98]"
                style={{ boxShadow: "0 4px 14px -8px rgba(16,185,129,0.3)" }}
              >
                <div
                  className="grid h-12 w-12 place-items-center rounded-2xl text-white"
                  style={{ background: "linear-gradient(135deg,#2DD4A8,#10B981)" }}
                >
                  <Sparkles size={20} strokeWidth={2.4} />
                </div>
                <div className="flex-1">
                  <p className="text-[15px] font-extrabold tracking-tight" style={{ color: "#0F1B17" }}>
                    {t("group.create")}
                  </p>
                  <p className="text-[12px] text-neutral-500">
                    Créer un nouveau groupe et inviter
                  </p>
                </div>
              </button>

              <button
                onClick={() => setMode("join")}
                className="flex w-full items-center gap-3 rounded-3xl border border-neutral-200 bg-white p-4 text-left transition active:scale-[0.98]"
              >
                <div className="grid h-12 w-12 place-items-center rounded-2xl bg-emerald-50 text-emerald-700">
                  <UserPlus size={20} strokeWidth={2.4} />
                </div>
                <div className="flex-1">
                  <p className="text-[15px] font-extrabold tracking-tight" style={{ color: "#0F1B17" }}>
                    {t("group.join")}
                  </p>
                  <p className="text-[12px] text-neutral-500">Entrer un code à 6 caractères</p>
                </div>
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <button
                onClick={() => setMode("home")}
                className="text-[13px] font-bold text-emerald-700"
              >
                ← Retour
              </button>
              <div className="rounded-3xl border border-neutral-200 bg-white p-5">
                <p className="text-[13px] font-bold text-neutral-700">{t("group.codeInput")}</p>
                <input
                  autoFocus
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value.toUpperCase().slice(0, 6))}
                  placeholder="ABC123"
                  className="mt-3 w-full rounded-2xl border border-neutral-200 bg-neutral-50 px-4 py-4 text-center font-mono text-2xl tracking-[0.4em] outline-none focus:border-emerald-500 focus:bg-white"
                />
                <button
                  onClick={joinGroupFn}
                  className="mt-4 w-full rounded-full py-3.5 text-[14px] font-bold text-white"
                  style={{ background: "linear-gradient(135deg,#2DD4A8,#10B981)" }}
                >
                  {t("group.join")}
                </button>
              </div>
            </div>
          )
        ) : (
          <div className="space-y-3">
            <div
              className="flex items-center justify-between gap-2 rounded-3xl p-5"
              style={{ background: "linear-gradient(135deg,#ECFDF5,#D1FAE5)" }}
            >
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-700">
                  {t(`group.role.${group.role}` as never)}
                </p>
                <p className="font-mono text-3xl font-extrabold tracking-widest text-emerald-900">
                  {group.code}
                </p>
              </div>
              <div className="flex gap-1.5">
                <button
                  onClick={() => copyCode(group.code)}
                  className="grid h-10 w-10 place-items-center rounded-full bg-white text-emerald-700 shadow-sm"
                  aria-label={t("common.copy")}
                >
                  <Copy size={15} />
                </button>
                <button
                  onClick={() => shareGroup(group.code)}
                  className="grid h-10 w-10 place-items-center rounded-full bg-white text-emerald-700 shadow-sm"
                  aria-label={t("common.share")}
                >
                  <Share2 size={15} />
                </button>
              </div>
            </div>

            <div className="rounded-3xl border border-neutral-200 p-4">
              <p className="text-[11px] font-bold uppercase tracking-wider text-neutral-600">
                {t("group.shared")}
              </p>
              {group.sharedData.ingredients.length > 0 ? (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {group.sharedData.ingredients.slice(0, 24).map((i) => (
                    <span
                      key={i}
                      className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs text-emerald-700"
                    >
                      {i}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="mt-1 text-xs text-neutral-500">{t("group.nothingShared")}</p>
              )}
              <button
                onClick={updateGroupIngredients}
                className="mt-3 w-full rounded-full bg-neutral-100 py-2.5 text-xs font-bold text-neutral-700"
              >
                {t("group.updateShared")}
              </button>
            </div>

            <div className="rounded-3xl border border-neutral-200 p-4">
              <p className="text-[11px] font-bold uppercase tracking-wider text-neutral-600">
                {t("group.sharedPlanning")}
              </p>
              <p className="mt-1 text-xs text-neutral-500">
                {group.sharedData.planning
                  ? `${group.sharedData.planning.days.filter((d) => d.recette).length} / 7`
                  : t("group.nothingShared")}
              </p>
              <button
                onClick={sharePlanning}
                className="mt-3 w-full rounded-full bg-neutral-100 py-2.5 text-xs font-bold text-neutral-700"
              >
                {t("group.sharePlanning")}
              </button>
            </div>

            <div className="rounded-3xl border border-neutral-200 p-4">
              <p className="text-[11px] font-bold uppercase tracking-wider text-neutral-600">
                {t("group.sync")}
              </p>
              <div className="mt-2 grid grid-cols-2 gap-2">
                <button
                  onClick={() => setShowExport(true)}
                  className="rounded-full border border-neutral-200 py-2.5 text-[11px] font-bold text-neutral-700"
                >
                  {t("group.exportBtn")}
                </button>
                <button
                  onClick={() => setShowImport(true)}
                  className="rounded-full border border-neutral-200 py-2.5 text-[11px] font-bold text-neutral-700"
                >
                  {t("group.importBtn")}
                </button>
              </div>
            </div>

            <button
              onClick={leaveGroup}
              className="w-full rounded-full border-2 border-red-500 py-3 text-sm font-bold text-red-500"
            >
              {t("group.leave")}
            </button>
          </div>
        )}
      </main>

      {showExport && group && (
        <SubModal title={t("group.exportTitle")} onClose={() => setShowExport(false)}>
          <textarea
            readOnly
            value={encodeExport(group)}
            className="h-32 w-full resize-none rounded-xl border border-neutral-200 bg-neutral-50 p-3 font-mono text-[10px]"
          />
          <p className="mt-2 text-xs text-neutral-500">{t("group.exportInstructions")}</p>
          <div className="mt-3 flex gap-2">
            <button
              onClick={() => {
                navigator.clipboard.writeText(encodeExport(group));
                toast.success(t("common.copied"));
              }}
              className="flex-1 rounded-full py-2 text-sm font-bold text-white"
              style={{ background: "linear-gradient(135deg,#2DD4A8,#10B981)" }}
            >
              {t("common.copy")}
            </button>
            <a
              href={`https://wa.me/?text=${encodeURIComponent(encodeExport(group))}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 rounded-full bg-emerald-600 py-2 text-center text-sm font-bold text-white"
            >
              WhatsApp
            </a>
          </div>
        </SubModal>
      )}

      {showImport && (
        <SubModal title={t("group.importBtn")} onClose={() => setShowImport(false)}>
          <textarea
            autoFocus
            value={importCode}
            onChange={(e) => setImportCode(e.target.value)}
            placeholder={t("group.importPlaceholder")}
            className="h-32 w-full resize-none rounded-xl border border-neutral-200 bg-white p-3 font-mono text-[10px]"
          />
          <button
            onClick={doImport}
            className="mt-3 w-full rounded-full py-2.5 text-sm font-bold text-white"
            style={{ background: "linear-gradient(135deg,#2DD4A8,#10B981)" }}
          >
            {t("common.import")}
          </button>
        </SubModal>
      )}
    </div>
  );
}

function SubModal({
  children,
  title,
  onClose,
}: {
  children: React.ReactNode;
  title: string;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-[110] flex items-end justify-center bg-black/50"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md animate-fade-up rounded-t-3xl bg-white p-5"
        style={{ paddingBottom: "calc(1.25rem + env(safe-area-inset-bottom))" }}
      >
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-[15px] font-extrabold tracking-tight">{title}</h3>
          <button
            onClick={onClose}
            className="grid h-8 w-8 place-items-center rounded-full bg-neutral-100 text-neutral-600"
          >
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
