import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import fr from "@/locales/fr.json";
import en from "@/locales/en.json";

export const LANG_KEY = "fridgechef_lang";
export const SUPPORTED = ["fr", "en"] as const;
export type Lang = (typeof SUPPORTED)[number];

export const LANG_NAMES: Record<Lang, string> = {
  fr: "Français",
  en: "English",
};

function detect(): Lang {
  if (typeof window === "undefined") return "fr";
  try {
    const v = localStorage.getItem(LANG_KEY) as Lang | null;
    if (v && SUPPORTED.includes(v)) return v;
  } catch {
    /* */
  }
  return "fr";
}

if (!i18n.isInitialized) {
  void i18n.use(initReactI18next).init({
    resources: {
      fr: { translation: fr },
      en: { translation: en },
    },
    lng: detect(),
    fallbackLng: "fr",
    interpolation: { escapeValue: false },
    keySeparator: false,
    nsSeparator: false,
    returnNull: false,
  });
}

export function setLanguage(lang: Lang) {
  void i18n.changeLanguage(lang);
  try {
    localStorage.setItem(LANG_KEY, lang);
  } catch {
    /* */
  }
  window.dispatchEvent(new CustomEvent("fridgechef:lang", { detail: lang }));
}

export function getLanguage(): Lang {
  const code = (i18n.language?.slice(0, 2) as Lang) || "fr";
  return SUPPORTED.includes(code) ? code : "fr";
}

export function getLanguageName(): string {
  return LANG_NAMES[getLanguage()];
}

export default i18n;
