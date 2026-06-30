import { useState } from "react";
import { Users, Copy, Share2, X } from "lucide-react";
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

export function GroupButton() {
  const { t } = useTranslation();
  const group = useLocalReactive(() => getGroup());
  const user = useLocalReactive(() => storage.getUser());
  const [open, setOpen] = useState(false);
  const [joining, setJoining] = useState(false);
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
    setJoining(false);
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
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11.5px] font-bold text-white transition active:scale-95"
        style={{
          background: "linear-gradient(135deg,#2DD4A8 0%,#10B981 100%)",
          boxShadow: "0 6px 16px -8px rgba(16,185,129,0.55)",
        }}
        aria-label={t("group.title")}
      >
        <Users size={13} strokeWidth={2.6} />
        {group ? (
          <span className="font-mono tracking-wider">{group.code}</span>
        ) : (
          <span>{t("group.title")}</span>
        )}
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[100] flex items-end justify-center bg-black/45 backdrop-blur-sm"
          onClick={() => setOpen(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md animate-fade-up rounded-t-3xl bg-white p-5"
            style={{ paddingBottom: "calc(1.25rem + env(safe-area-inset-bottom))" }}
          >
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div
                  className="grid h-9 w-9 place-items-center rounded-2xl text-white"
                  style={{ background: "linear-gradient(135deg,#2DD4A8,#10B981)" }}
                >
                  <Users size={16} strokeWidth={2.6} />
                </div>
                <h3 className="text-[16px] font-extrabold tracking-tight" style={{ color: "#0F1B17" }}>
                  {t("group.title")}
                </h3>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="grid h-8 w-8 place-items-center rounded-full bg-neutral-100 text-neutral-600"
                aria-label={t("common.close" as never) || "Close"}
              >
                <X size={15} />
              </button>
            </div>

            {!group ? (
              <div className="space-y-3">
                <p className="text-[12.5px] text-neutral-500">
                  Partagez votre frigo, vos courses et votre planning avec vos colocataires ou votre famille.
                </p>
                <button
                  onClick={createGroup}
                  className="w-full rounded-full py-3 text-[14px] font-bold text-white"
                  style={{ background: "linear-gradient(135deg,#2DD4A8,#10B981)" }}
                >
                  {t("group.create")}
                </button>
                {!joining ? (
                  <button
                    onClick={() => setJoining(true)}
                    className="w-full rounded-full border-2 py-3 text-[14px] font-bold"
                    style={{ borderColor: "#10B981", color: "#10B981" }}
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
                      className="flex-1 rounded-full border border-neutral-200 bg-white px-4 py-3 text-sm font-mono tracking-widest outline-none focus:border-emerald-500"
                    />
                    <button
                      onClick={joinGroupFn}
                      className="rounded-full px-5 text-sm font-bold text-white"
                      style={{ background: "linear-gradient(135deg,#2DD4A8,#10B981)" }}
                    >
                      OK
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                <div
                  className="flex items-center justify-between gap-2 rounded-2xl p-4"
                  style={{ background: "linear-gradient(135deg,#ECFDF5,#D1FAE5)" }}
                >
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-700">
                      {t(`group.role.${group.role}` as never)}
                    </p>
                    <p className="font-mono text-2xl font-extrabold tracking-widest text-emerald-900">
                      {group.code}
                    </p>
                  </div>
                  <div className="flex gap-1.5">
                    <button
                      onClick={() => copyCode(group.code)}
                      className="grid h-9 w-9 place-items-center rounded-full bg-white text-emerald-700 shadow-sm"
                      aria-label={t("common.copy")}
                    >
                      <Copy size={14} />
                    </button>
                    <button
                      onClick={() => shareGroup(group.code)}
                      className="grid h-9 w-9 place-items-center rounded-full bg-white text-emerald-700 shadow-sm"
                      aria-label={t("common.share")}
                    >
                      <Share2 size={14} />
                    </button>
                  </div>
                </div>

                <div className="rounded-2xl border border-neutral-200 p-3">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-neutral-600">
                    {t("group.shared")}
                  </p>
                  {group.sharedData.ingredients.length > 0 ? (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {group.sharedData.ingredients.slice(0, 12).map((i) => (
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
                    className="mt-3 w-full rounded-full bg-neutral-100 py-2 text-xs font-bold text-neutral-700"
                  >
                    {t("group.updateShared")}
                  </button>
                </div>

                <div className="rounded-2xl border border-neutral-200 p-3">
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
                    className="mt-3 w-full rounded-full bg-neutral-100 py-2 text-xs font-bold text-neutral-700"
                  >
                    {t("group.sharePlanning")}
                  </button>
                </div>

                <div className="rounded-2xl border border-neutral-200 p-3">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-neutral-600">
                    {t("group.sync")}
                  </p>
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    <button
                      onClick={() => setShowExport(true)}
                      className="rounded-full border border-neutral-200 py-2 text-[11px] font-bold text-neutral-700"
                    >
                      {t("group.exportBtn")}
                    </button>
                    <button
                      onClick={() => setShowImport(true)}
                      className="rounded-full border border-neutral-200 py-2 text-[11px] font-bold text-neutral-700"
                    >
                      {t("group.importBtn")}
                    </button>
                  </div>
                </div>

                <button
                  onClick={leaveGroup}
                  className="w-full rounded-full border-2 border-red-500 py-2.5 text-sm font-bold text-red-500"
                >
                  {t("group.leave")}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

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
    </>
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
            <X size={15} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
