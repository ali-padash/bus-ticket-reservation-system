import { Link } from "react-router-dom";
import { useLocale } from "../util/useLocale";

interface Props {
  // Called when a link that leads somewhere is pressed, so the menu that holds it can close.
  onNavigate?: () => void;
}

// "Find a ticket" is the one link that leads to a page so far. (updated 2026-10-13)
const MainChoces = ({ onNavigate }: Props) => {
  const { t, path } = useLocale();
  return (
    <>
        <li><a href="#">{t("nav.guide")}</a></li>
        <li><a href="#">{t("nav.agency")}</a></li>
        <li><a href="#">{t("nav.articles")}</a></li>
        <li><a href="#">{t("nav.cancelTicket")}</a></li>
        <li><Link to={path("/tickets")} onClick={onNavigate}>{t("nav.findTicket")}</Link></li>
        <li><a href="#">{t("nav.busTickets")}</a></li>
    </>
  )
}

export default MainChoces
