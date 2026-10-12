import "../assets/css/logo.css";
import { useLocale } from "../util/useLocale";

interface Props {
  // "blue" on a light background, "white" on the blue bar.
  variant?: "blue" | "white";
  // The height of the mark in pixels. The name beside it is sized from the same number.
  size?: number;
  // Only the mark, without the name. For small decorative places such as the loading spinner.
  markOnly?: boolean;
  className?: string;
}

// The mark: a map pin with a road running up through it, drawn as one shape. The road is a
// hole in the pin and the dashes of its centre line are filled again, so the mark has a
// single colour and takes it from the text colour around it. The same shape is the tab icon
// in `public/favicon.svg`.
const MARK =
  "M16 1.5C9.4 1.5 4 6.8 4 13.4c0 7.9 9.5 15.9 11 17.1a1.6 1.6 0 0 0 2 0c1.5-1.2 11-9.2 11-17.1C28 6.8 22.6 1.5 16 1.5Z" +
  "M14.3 5.5h3.4l4.3 16h-12Z" +
  "M15.3 7h1.4l.3 2.6h-2ZM14.9 11.4h2.2l.4 3.2h-3ZM14.4 16.4h3.2l.5 4h-4.2Z";

// The site's logo: the mark, then the name as real text. The name is text and not a picture
// so that it follows the language of the page ("Rahi" or "راهی") and its font, stays sharp at
// any size, and can be read by screen readers and search engines. (written 2026-10-13)
const Logo = ({ variant = "blue", size = 30, markOnly = false, className = "" }: Props) => {
  const { t } = useLocale();
  return (
    <div className={`site-logo ${variant} ${className}`} style={{ fontSize: `${size}px` }}>
      <svg className="site-logo-mark" viewBox="0 0 32 32" aria-hidden="true" focusable="false">
        <path fillRule="evenodd" d={MARK} />
      </svg>
      {!markOnly && <div className="site-logo-name">{t("meta.name")}</div>}
    </div>
  );
};

export default Logo;
