import React from 'react'
import "../assets/css/sidebar.css"
import log from "../assets/images/logoWhite.282e17b9.svg"
import MainChoces from './MainChoces';
import LanguageSwitch from './LanguageSwitch';
import { PHONE_AREA, PHONE_NUMBER } from '../util/Locale';
import { useLocale } from '../util/useLocale';

interface Props {
  bringList: boolean;
  setBringList: (bringList: boolean) => void;
  sidebarRef: React.RefObject<HTMLDivElement>;
}

const Sidebar = ({ bringList, setBringList, sidebarRef} : Props) => {
  const { t, num } = useLocale();
  return (
    <>
    <div className={`sidebar-blackcover${(bringList) ? " show" : ""}`}></div>
    <div className={`sidebar${(bringList) ? " show" : ""}`} ref={sidebarRef}>
      <div className='sidebar-blueheader'>
        <i role="button" aria-label={t("nav.closeMenu")} onClick={() => setBringList(false)}>×</i>
        <img src={log} alt={t("nav.logoAlt")} />
        <p><br/>{t("nav.slogan")}</p>
        <span>{t("nav.support")}</span>
        <div className='phone-number' dir="ltr"><span>{num(PHONE_AREA)}</span><span>{num(PHONE_NUMBER)}</span></div>
      </div>
      <ul className='list'>
        <li><a>{t("nav.register")}</a></li>
        <li style={{marginTop: "25px"}}><a>{t("nav.login")}</a></li>
        <li><a>{t("nav.contact")}</a></li>
        <li style={{marginTop: "25px"}}><a>{t("nav.about")}</a></li>
        <MainChoces/>
        {/* The list is drawn bottom-up, so the last item is the one on top. */}
        <li data-lang-switch><LanguageSwitch /></li>
      </ul>
    </div>
    </>
  )
}

export default Sidebar
