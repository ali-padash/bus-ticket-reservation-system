import { useMemo } from "react";
import { useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { City } from "./Models";
import {
  DEFAULT_LANG,
  Lang,
  cityName,
  directionOf,
  formatAmount,
  formatNumber,
  isLang,
  localName,
  localText,
  provinceName,
} from "./Locale";

// The language of the page, read from the address: /en/... or /fa/... . Nothing else stores it.
export const useLang = (): Lang => {
  const { lang } = useParams();
  return isLang(lang) ? lang : DEFAULT_LANG;
};

// What a component needs to speak the page's language: the texts (`t`), the helpers of
// Locale.ts already tied to that language, and `path`, which puts the language in front of an
// address inside the site. (written 2026-10-12)
export const useLocale = () => {
  const lang = useLang();
  // Asking for the texts of one named language keeps the address in charge: the texts cannot
  // disagree with the digits, the dates or the direction, which come from the same `lang`.
  const { t } = useTranslation(undefined, { lng: lang });
  return useMemo(() => {
    const dir = directionOf(lang);
    return {
      lang,
      dir,
      t,
      path: (rest: string) => `/${lang}${rest}`,
      num: (value: string | number) => formatNumber(lang, value),
      amount: (value: number) => formatAmount(lang, value),
      price: (value: number) => t("common.price", { amount: formatAmount(lang, value) }),
      name: (persianName: string, englishSlug: string | undefined) => localName(lang, persianName, englishSlug),
      text: (persianText: string, englishText: string | undefined) => localText(lang, persianText, englishText),
      terminal: (persianName: string, englishSlug: string | undefined) =>
        t("common.terminal", { name: localName(lang, persianName, englishSlug) }),
      cityName: (city: City) => cityName(lang, city),
      provinceName: (city: City) => provinceName(lang, city),
      // Font Awesome classes for arrows that follow the reading direction: "forward" points
      // where the text runs, "back" the other way.
      icons:
        dir === "rtl"
          ? { back: "fa-chevron-right", forward: "fa-chevron-left", arrow: "fa-arrow-left" }
          : { back: "fa-chevron-left", forward: "fa-chevron-right", arrow: "fa-arrow-right" },
    };
  }, [lang, t]);
};
