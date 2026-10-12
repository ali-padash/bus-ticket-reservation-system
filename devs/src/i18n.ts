import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import en from "./locales/en.json";
import fa from "./locales/fa.json";

// Both languages are small text files, so they are bundled; nothing is fetched at runtime.
//
// `lng` below is only what the library needs to start. The language of a page is never read
// from here: every component gets its texts through `useLocale`, which asks for the language
// named in the address (/en/... or /fa/...). So the address stays the only place that says
// which language is on screen. (written 2026-10-12)
i18n.use(initReactI18next).init({
  resources: { en: { translation: en }, fa: { translation: fa } },
  lng: "en",
  fallbackLng: "en",
  // React already escapes what it draws.
  interpolation: { escapeValue: false },
});

export default i18n;
