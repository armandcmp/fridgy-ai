import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import fr from "@/locales/fr.json";
import en from "@/locales/en.json";
import es from "@/locales/es.json";
import pt from "@/locales/pt.json";
import zh from "@/locales/zh.json";

export const LANGUAGES = [
  { code: "fr", name: "Français", flag: "🇫🇷" },
  { code: "en", name: "English", flag: "🇬🇧" },
  { code: "es", name: "Español", flag: "🇪🇸" },
  { code: "pt", name: "Português", flag: "🇧🇷" },
  { code: "zh", name: "中文", flag: "🇨🇳" },
] as const;

export type LangCode = (typeof LANGUAGES)[number]["code"];

export const LANGUAGE_NAME_FOR_AI: Record<LangCode, string> = {
  fr: "French",
  en: "English",
  es: "Spanish",
  pt: "Portuguese",
  zh: "Chinese (Simplified)",
};

const stored =
  typeof window !== "undefined"
    ? (localStorage.getItem("fridgechef_lang") as LangCode | null)
    : null;

if (!i18n.isInitialized) {
  i18n.use(initReactI18next).init({
    resources: {
      fr: { translation: fr },
      en: { translation: en },
      es: { translation: es },
      pt: { translation: pt },
      zh: { translation: zh },
    },
    lng: stored ?? "fr",
    fallbackLng: "fr",
    interpolation: { escapeValue: false },
    returnNull: false,
  });
}

export function setLanguage(code: LangCode) {
  localStorage.setItem("fridgechef_lang", code);
  i18n.changeLanguage(code);
}

export function getLanguage(): LangCode {
  if (typeof window === "undefined") return "fr";
  return (localStorage.getItem("fridgechef_lang") as LangCode | null) ?? "fr";
}

export default i18n;
