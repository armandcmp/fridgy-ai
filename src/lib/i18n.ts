import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import fr from "../locales/fr.json";
import en from "../locales/en.json";
import es from "../locales/es.json";
import pt from "../locales/pt.json";
import zh from "../locales/zh.json";

export type Lang = "fr" | "en" | "es" | "pt" | "zh";

export const LANGS: { code: Lang; flag: string; label: string }[] = [
  { code: "fr", flag: "🇫🇷", label: "Français" },
  { code: "en", flag: "🇬🇧", label: "English" },
  { code: "es", flag: "🇪🇸", label: "Español" },
  { code: "pt", flag: "🇧🇷", label: "Português" },
  { code: "zh", flag: "🇨🇳", label: "中文" },
];

export const LANG_NAMES: Record<Lang, string> = {
  fr: "français",
  en: "english",
  es: "español",
  pt: "português",
  zh: "中文 (Mandarin)",
};

function readInitial(): Lang {
  if (typeof window === "undefined") return "fr";
  const saved = localStorage.getItem("fridgechef_lang");
  if (saved && ["fr", "en", "es", "pt", "zh"].includes(saved)) return saved as Lang;
  return "fr";
}

if (!i18n.isInitialized) {
  i18n.use(initReactI18next).init({
    resources: {
      fr: { translation: fr },
      en: { translation: en },
      es: { translation: es },
      pt: { translation: pt },
      zh: { translation: zh },
    },
    lng: readInitial(),
    fallbackLng: "fr",
    interpolation: { escapeValue: false },
    react: { useSuspense: false },
  });
}

export function setLang(lang: Lang) {
  if (typeof window !== "undefined") {
    localStorage.setItem("fridgechef_lang", lang);
  }
  i18n.changeLanguage(lang);
}

export function getLang(): Lang {
  return (i18n.language as Lang) || "fr";
}

export default i18n;
