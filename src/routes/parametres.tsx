import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ChevronRight,
  Crown,
  Bell,
  Users,
  LogOut,
  Copy,
  Calendar,
  History,
} from "lucide-react";
import { toast } from "sonner";
import { storage } from "@/lib/storage";
import { useLocalReactive } from "@/lib/hooks";
import { LANGS, setLang, type Lang } from "@/lib/i18n";
import { Avatar, PALETTE } from "@/components/Avatar";
import { Switch } from "@/components/ui/switch";
import { usePaywall } from "@/components/PaywallProvider";
import {
  notifPermission,
  requestNotifPermission,
  scheduleMealReminder,
  scheduleWeeklyReminder,
} from "@/lib/notifications";

export const Route = createFileRoute("/parametres")({
  component: Parametres,
});

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-6">
      <h2 className="mb-2 px-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        {title}
      </h2>
      <div className="fc-card divide-y divide-border overflow-hidden">{children}</div>
    </section>
  );
}

function Row({
  label,
  value,
  onClick,
  rightSlot,
}: {
  label: React.ReactNode;
  value?: React.ReactNode;
  onClick?: () => void;
  rightSlot?: React.ReactNode;
}) {
  const Wrap = onClick ? "button" : "div";
  return (
    <Wrap
      onClick={onClick}
      className={`flex w-full items-center gap-3 px-4 py-3 text-left ${
        onClick ? "transition hover:bg-muted/40" : ""
      }`}
    >
      <span className="flex-1 text-sm">{label}</span>
      {value !== undefined && (
        <span className="text-xs text-muted-foreground">{value}</span>
      )}
      {rightSlot}
      {onClick && <ChevronRight size={16} className="text-muted-foreground" />}
    </Wrap>
  );
}

function Parametres() {
  const { t, i18n } = useTranslation();
  const nav = useNavigate();
  const user = useLocalReactive(() => storage.getUser());
  const premium = useLocalReactive(() => storage.isPremium());
  const notif = useLocalReactive(() => storage.getNotif());
  const units = useLocalReactive(() => storage.getUnits());
  const group = useLocalReactive(() => storage.getGroup());

  const [nameEdit, setNameEdit] = useState(false);
  const [tempName, setTempName] = useState(user?.name ?? "");
  const [showLangs, setShowLangs] = useState(false);
  const [showGroupForm, setShowGroupForm] = useState<"none" | "join">("none");
  const [joinCode, setJoinCode] = useState("");
  const { open: openPaywall } = usePaywall();

  const saveName = () => {
    const v = tempName.trim();
    if (!v) return;
    storage.updateUser({ name: v });
    setNameEdit(false);
    toast.success("Nom mis à jour");
  };

  const toggleNotif = async (k: keyof typeof notif, v: boolean) => {
    const next = { ...notif, [k]: v };
    storage.setNotif(next);
    if (k === "mealReminder") scheduleMealReminder();
    if (k === "planningReminder") scheduleWeeklyReminder();
  };

  const enableNotifs = async () => {
    const p = await requestNotifPermission();
    if (p === "granted") {
      toast.success("Notifications activées");
      scheduleMealReminder();
      scheduleWeeklyReminder();
    } else {
      toast.error("Permission refusée");
    }
  };

  const setUserColor = (color: string) => {
    storage.updateUser({ avatarColor: color });
  };

  const createGroup = () => {
    if (!user) return;
    storage.createGroup(user.name);
    toast.success(t("group.created"));
  };

  const doJoin = () => {
    if (!user) return;
    const g = storage.joinGroup(joinCode, user.name);
    if (!g) {
      toast.error(t("group.invalid_code"));
      return;
    }
    setJoinCode("");
    setShowGroupForm("none");
    toast.success(t("group.joined"));
  };

  const syncGroup = async () => {
    const data = storage.exportGroup();
    if (!data) return;
    try {
      await navigator.clipboard.writeText(data);
      toast.success(t("group.export_done"));
    } catch {
      toast.error("Erreur copie");
    }
  };

  const importGroup = async () => {
    const v = window.prompt(t("group.import_prompt"));
    if (!v) return;
    if (storage.importGroup(v)) toast.success(t("group.imported"));
    else toast.error("Erreur import");
  };

  const exportAll = () => {
    const data = storage.exportAll();
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "fridgechef-data.json";
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!user) return null;

  return (
    <div className="px-5 pt-8">
      <header className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t("settings.title")}</h1>
        {premium && (
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-1 text-[10px] font-bold text-amber-700">
            <Crown size={12} /> PRO
          </span>
        )}
      </header>

      {/* Quick links */}
      <div className="grid grid-cols-2 gap-3">
        <Link to="/planning" className="fc-card flex items-center gap-2 p-3 text-sm font-medium">
          <Calendar size={16} className="text-primary" /> {t("nav.planning")}
        </Link>
        <Link to="/historique" className="fc-card flex items-center gap-2 p-3 text-sm font-medium">
          <History size={16} className="text-primary" /> {t("nav.history")}
        </Link>
      </div>

      {/* Profile */}
      <Section title={t("settings.profile")}>
        <div className="flex items-center gap-3 px-4 py-4">
          <Avatar name={user.name} color={user.avatarColor} size={48} />
          <div className="flex-1">
            {nameEdit ? (
              <div className="flex gap-2">
                <input
                  value={tempName}
                  onChange={(e) => setTempName(e.target.value)}
                  className="flex-1 rounded-lg border border-input bg-background px-2 py-1 text-sm"
                />
                <button
                  onClick={saveName}
                  className="rounded-full bg-primary px-3 text-xs font-semibold text-primary-foreground"
                >
                  {t("common.save")}
                </button>
              </div>
            ) : (
              <button
                onClick={() => {
                  setTempName(user.name);
                  setNameEdit(true);
                }}
                className="text-left"
              >
                <p className="text-sm font-semibold">{user.name}</p>
                <p className="text-[11px] text-muted-foreground">{user.program}</p>
              </button>
            )}
          </div>
        </div>
        <div className="px-4 py-3">
          <p className="mb-2 text-xs text-muted-foreground">Couleur de l'avatar</p>
          <div className="flex flex-wrap gap-2">
            {PALETTE.map((c) => (
              <button
                key={c}
                onClick={() => setUserColor(c)}
                className={`h-7 w-7 rounded-full transition ${
                  user.avatarColor === c ? "ring-2 ring-offset-2 ring-foreground" : ""
                }`}
                style={{ background: c }}
                aria-label={c}
              />
            ))}
          </div>
        </div>
        <Row
          label={t("settings.program")}
          value={user.program}
          onClick={() => nav({ to: "/onboarding" })}
        />
      </Section>

      {/* Preferences */}
      <Section title={t("settings.prefs")}>
        <Row
          label={t("settings.language")}
          value={LANGS.find((l) => l.code === i18n.language)?.flag + " " + (LANGS.find((l) => l.code === i18n.language)?.label ?? "")}
          onClick={() => setShowLangs(!showLangs)}
        />
        {showLangs && (
          <div className="bg-muted/30 px-2 py-2">
            {LANGS.map((l) => (
              <button
                key={l.code}
                onClick={() => {
                  setLang(l.code as Lang);
                  setShowLangs(false);
                }}
                className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm ${
                  i18n.language === l.code ? "bg-primary/10 text-primary" : ""
                }`}
              >
                <span className="text-lg">{l.flag}</span> {l.label}
              </button>
            ))}
          </div>
        )}
        <Row
          label={t("settings.units")}
          value={units === "metric" ? t("settings.units_metric") : t("settings.units_imperial")}
          onClick={() => storage.setUnits(units === "metric" ? "imperial" : "metric")}
        />
        {/* Notifications */}
        <div className="px-4 py-3">
          <div className="flex items-center justify-between">
            <span className="inline-flex items-center gap-2 text-sm font-medium">
              <Bell size={15} /> {t("settings.notifications")}
            </span>
            {notifPermission() === "granted" ? (
              <span className="text-[10px] font-semibold uppercase text-emerald-600">ON</span>
            ) : (
              <button
                onClick={enableNotifs}
                className="rounded-full bg-primary px-3 py-1 text-[11px] font-semibold text-primary-foreground"
              >
                {t("notif.enable")}
              </button>
            )}
          </div>
          {notifPermission() === "granted" && (
            <div className="mt-3 space-y-2.5">
              <label className="flex items-center justify-between text-sm">
                <span>{t("settings.meal_reminders")}</span>
                <Switch
                  checked={notif.mealReminder}
                  onCheckedChange={(v) => toggleNotif("mealReminder", v)}
                />
              </label>
              {notif.mealReminder && (
                <label className="flex items-center justify-between text-sm">
                  <span>{t("settings.reminder_time")}</span>
                  <input
                    type="time"
                    value={notif.mealTime}
                    onChange={(e) => storage.setNotif({ ...notif, mealTime: e.target.value })}
                    className="rounded-lg border border-input bg-background px-2 py-1 text-sm"
                  />
                </label>
              )}
              <label className="flex items-center justify-between text-sm">
                <span>{t("settings.planning_reminders")}</span>
                <Switch
                  checked={notif.planningReminder}
                  onCheckedChange={(v) => toggleNotif("planningReminder", v)}
                />
              </label>
              <label className="flex items-center justify-between text-sm">
                <span>{t("settings.streak_reminders")}</span>
                <Switch
                  checked={notif.streakReminder}
                  onCheckedChange={(v) => toggleNotif("streakReminder", v)}
                />
              </label>
            </div>
          )}
        </div>
      </Section>

      {/* Group */}
      <Section title={t("settings.group")}>
        {!group ? (
          <>
            <Row
              label={<span className="inline-flex items-center gap-2"><Users size={15} /> {t("group.create")}</span>}
              onClick={createGroup}
            />
            <Row
              label={t("group.join")}
              onClick={() => setShowGroupForm(showGroupForm === "join" ? "none" : "join")}
            />
            {showGroupForm === "join" && (
              <div className="bg-muted/30 px-4 py-3">
                <input
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                  placeholder={t("group.enter_code")}
                  maxLength={6}
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-center text-lg font-bold tracking-widest"
                />
                <button
                  onClick={doJoin}
                  className="mt-2 w-full rounded-full bg-primary py-2 text-sm font-semibold text-primary-foreground"
                >
                  {t("group.join")}
                </button>
              </div>
            )}
          </>
        ) : (
          <>
            <div className="px-4 py-4 text-center">
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
                {t("group.code")}
              </p>
              <p className="my-2 text-3xl font-extrabold tracking-widest text-primary">
                {group.code}
              </p>
              <button
                onClick={async () => {
                  await navigator.clipboard.writeText(group.code);
                  toast.success(t("group.copied"));
                }}
                className="inline-flex items-center gap-1.5 rounded-full border border-input px-3 py-1 text-xs"
              >
                <Copy size={12} /> {t("group.copy_code")}
              </button>
            </div>
            <div className="px-4 pb-3">
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                {t("group.members")}
              </p>
              <div className="flex flex-wrap gap-2">
                {group.members.map((m) => (
                  <div key={m} className="inline-flex items-center gap-2 rounded-full bg-muted/50 px-2 py-1">
                    <Avatar name={m} size={20} />
                    <span className="text-xs">{m}</span>
                  </div>
                ))}
              </div>
            </div>
            <Row label={t("group.sync")} onClick={syncGroup} />
            <Row label="Importer des données reçues" onClick={importGroup} />
            <Row
              label={
                <span className="inline-flex items-center gap-2 text-destructive">
                  <LogOut size={15} /> {t("group.leave")}
                </span>
              }
              onClick={() => {
                storage.leaveGroup();
                toast.success(t("group.left"));
              }}
            />
          </>
        )}
      </Section>

      {/* Subscription */}
      <Section title={t("settings.subscription")}>
        <Row
          label={
            <span className="inline-flex items-center gap-2">
              {premium ? <Crown size={15} className="text-amber-600" /> : null}
              {premium ? t("settings.plan_pro") : t("settings.plan_free")}
            </span>
          }
        />
        {!premium && (
          <Row label={t("settings.upgrade")} onClick={openPaywall} />
        )}
      </Section>

      {/* Data */}
      <Section title={t("settings.data")}>
        <Row
          label={t("settings.clear_history")}
          onClick={() => {
            if (window.confirm(t("settings.clear_history") + " ?")) {
              storage.clearHistory();
              toast.success("Historique effacé");
            }
          }}
        />
        <Row label={t("settings.export")} onClick={exportAll} />
        <Row
          label={<span className="text-destructive">{t("settings.reset_app")}</span>}
          onClick={() => {
            if (window.confirm(t("settings.reset_app") + " ?")) {
              storage.resetAll();
              nav({ to: "/onboarding" });
            }
          }}
        />
      </Section>

      {/* About */}
      <Section title={t("settings.about")}>
        <Row label={t("settings.version")} value="3.0.0" />
        <Row
          label={t("settings.contact")}
          onClick={() => window.open("mailto:hello@fridgechef.app", "_blank")}
        />
        <Row label={t("settings.rate")} onClick={() => toast("⭐️ Merci !")} />
        <Row label={t("settings.privacy")} onClick={() => toast("Politique de confidentialité bientôt disponible")} />
      </Section>

      {/* Dev */}
      <div className="mt-8 pb-8 text-center">
        <button
          onClick={() => {
            storage.setPremium(!premium);
            toast(premium ? "Premium désactivé" : "Premium activé 👑");
          }}
          className="text-[11px] text-muted-foreground underline"
        >
          {t("settings.dev_premium")}
        </button>
      </div>
    </div>
  );
}
