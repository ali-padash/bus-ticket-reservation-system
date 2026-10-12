import { useLayoutEffect } from "react";
import { Navigate, Outlet, useLocation, useParams } from "react-router-dom";
import { DEFAULT_LANG, isLang } from "../util/Locale";
import { useLocale } from "../util/useLocale";

// Addresses from before the site had two languages. They keep working: they lead to the same
// page in English, with the rest of the address kept.
const pagesWithoutLanguage = ["services", "booking", "tickets"];

// Sits above every page and reads the language from the first part of the address.
// - /en/... and /fa/...: draws the page, and tells the browser the language and the writing
//   direction by setting `lang` and `dir` on <html>. All the CSS mirrors itself from that one
//   `dir`, and the tab title comes from the same language.
// - /services?from=1&to=21 (an old address): goes to /en/services?from=1&to=21.
// - anything else in the language's place: goes to /en/.
// (written 2026-10-12)
const LanguageLayout = () => {
  const { lang: langInAddress } = useParams();
  const location = useLocation();
  const { lang, dir, t } = useLocale();
  const title = t("meta.title");

  // A layout effect runs before the browser paints, so a page is never seen for a moment in
  // the wrong direction.
  useLayoutEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = dir;
    document.title = title;
  }, [lang, dir, title]);

  if (!isLang(langInAddress)) {
    const rest = pagesWithoutLanguage.includes(langInAddress ?? "")
      ? `${location.pathname}${location.search}${location.hash}`
      : "/";
    return <Navigate to={`/${DEFAULT_LANG}${rest}`} replace />;
  }
  return <Outlet />;
};

export default LanguageLayout;
