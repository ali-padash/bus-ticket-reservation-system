import React from "react";
import Logo from "./Logo";
import "../assets/css/lowerNavbar.css";
import MainChoces from "./MainChoces";
import { useLocale } from "../util/useLocale";
import Icon from "./Icon";

interface Props {
  scrolled: boolean;
  bringList: boolean;
  setBringList: (bringList: boolean) => void;
  menuListRef: React.RefObject<HTMLUListElement>;
  iconListRef: React.RefObject<HTMLElement>;
  isFocused: boolean;
}

const LowerNavbar = ({ scrolled, bringList, setBringList, menuListRef, iconListRef, isFocused }: Props) => {
  const { t } = useLocale();
  return (
    <div
      className="lower-top-bar"
      style={{
        height: scrolled ? "70px" : "95px",
        transform: scrolled ? "translateY(0px)" : "translateY(40px)",
      }}>
      <div className={"element-cover" + (isFocused ? " show" : "")} />
      <Icon
        name="bars"
        role="button"
        aria-label={t(bringList ? "nav.closeMenu" : "nav.openMenu")}
        ref={iconListRef}
        onClick={() => setBringList(!bringList)}
      />

      {/* Where the menu slides to is in the CSS (`.menu` and `.menu.open`), because the
          direction of the slide depends on the writing direction. (updated 2026-10-12) */}
      <ul className={`menu${bringList ? " open" : ""}`} ref={menuListRef}>
        <MainChoces onNavigate={() => setBringList(false)} />
        <i role="button" aria-label={t("nav.closeMenu")} onClick={() => setBringList(false)}>×</i>
      </ul>
      <a href="#" className="before-logo">
        {t("nav.slogan")}
      </a>
      <a href="#" className="actual-logo">
        <Logo size={scrolled ? 30 : 36} />
      </a>
    </div>
  );
};

export default LowerNavbar;
