import React from "react";
import "../assets/css/upperNavbar.css";
import Logo from "./Logo";
import LanguageSwitch from "./LanguageSwitch";
import { PHONE_AREA, PHONE_NUMBER } from "../util/Locale";
import { useLocale } from "../util/useLocale";
import Icon from "./Icon";

interface Props {
  scrolled: boolean;
  style: React.CSSProperties;
  isFocused: boolean;
  setBringList: (bringList: boolean) => void;
}

const UpperNavbar = ({ scrolled, style, isFocused, setBringList }: Props) => {
  const { t, num } = useLocale();
  return (
    <div className={`upper-top-bar${scrolled ? " show" : ""}`} style={style} tabIndex={0}>
      <div className={"element-cover" + (isFocused ? " show" : "")} />
      <div className="one">
        <a href="#" className="register">
          {t("nav.register")}
        </a>
        <div className="separator-line"></div>
        <a href="#" className="enter">
          {t("nav.login")}
        </a>
        <div className="separator-line" data-lang-switch></div>
        <LanguageSwitch />
        <a href="#" className="call-us">
          {t("nav.contact")}
        </a>
        <div className="separator-line"></div>
        <a href="#" className="about-us">
          {t("nav.about")}
        </a>
        <div className="separator-line"></div>
        {/* A phone number is read from left to right in both languages, so its two halves sit
            in a span with its own direction. (updated 2026-10-12) */}
        <p>
          <span className="label">{t("nav.support")}</span>{" "}
          <span className="phone" dir="ltr">
            <span>{num(PHONE_AREA)}</span>
            <span>{num(PHONE_NUMBER)}</span>
          </span>
        </p>
      </div>
      <div className="two">
        <Logo variant="white" size={26} />
        <div className="call-us">
          <h6>{t("nav.support")}</h6>
          <span>{num(PHONE_AREA)}</span>
          <span>{num(PHONE_NUMBER)}</span>
        </div>
        <LanguageSwitch className="language" />
        <div className="menu-div" role="button" aria-label={t("nav.openMenu")} onClick={() => setBringList(true)}>
          <span>{t("nav.menu")}</span>
          <Icon name="bars" />
        </div>
      </div>
    </div>
  );
};

export default UpperNavbar;
