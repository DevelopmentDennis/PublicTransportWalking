import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import de from "./locales/de.json";
import en from "./locales/en.json";

export const SUPPORTED_LANGUAGES = ["en", "de"] as const;
export type AppLanguage = (typeof SUPPORTED_LANGUAGES)[number];

export function resolveLanguage(
  preferred: readonly string[] | undefined,
): AppLanguage {
  for (const tag of preferred ?? []) {
    const base = tag.toLowerCase().split("-")[0];
    const match = SUPPORTED_LANGUAGES.find((language) => language === base);
    if (match) return match;
  }
  return "en";
}

function applyDocumentLanguage(language: string): void {
  document.documentElement.lang = language;
  document.title = i18n.t("app.title");
}

void i18n.use(initReactI18next).init({
  resources: { en: { translation: en }, de: { translation: de } },
  lng: resolveLanguage(
    typeof navigator === "undefined" ? undefined : navigator.languages,
  ),
  fallbackLng: "en",
  interpolation: { escapeValue: false },
});

if (typeof document !== "undefined") {
  applyDocumentLanguage(i18n.language);
  i18n.on("languageChanged", applyDocumentLanguage);
}

export default i18n;
