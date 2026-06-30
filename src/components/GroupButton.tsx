import { Users } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { useLocalReactive } from "@/lib/hooks";
import { getGroup } from "@/lib/group";

export function GroupButton() {
  const { t } = useTranslation();
  const group = useLocalReactive(() => getGroup());

  return (
    <Link
      to="/groupe"
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
    </Link>
  );
}

