import { Link, useLocation } from "react-router-dom";
import { useLocale } from "../util/useLocale";

interface Props {
  className?: string;
}

// The link to the same page in the other language. Only the first part of the address
// changes; the rest of the path and the query stay, so a visitor in the middle of a booking
// lands on the same step with the same seats. The link is written in the language it leads
// to (and marked with that language for screen readers), so someone who cannot read the
// current page can still find it. (written 2026-10-12)
const LanguageSwitch = ({ className }: Props) => {
  const { lang, t } = useLocale();
  const location = useLocation();
  const other = lang === "en" ? "fa" : "en";
  const rest = location.pathname.replace(/^\/[^/]*/, "");
  return (
    <Link
      className={className}
      to={`/${other}${rest || "/"}${location.search}${location.hash}`}
      lang={other}
      hrefLang={other}
      data-lang-switch>
      {t("nav.otherLanguage")}
    </Link>
  );
};

export default LanguageSwitch;
