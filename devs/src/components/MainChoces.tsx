import { useLocale } from "../util/useLocale";

const MainChoces = () => {
  const { t } = useLocale();
  return (
    <>
        <li><a href="#">{t("nav.guide")}</a></li>
        <li><a href="#">{t("nav.agency")}</a></li>
        <li><a href="#">{t("nav.articles")}</a></li>
        <li><a href="#">{t("nav.cancelTicket")}</a></li>
        <li><a href="#">{t("nav.findTicket")}</a></li>
        <li><a href="#">{t("nav.busTickets")}</a></li>
    </>
  )
}

export default MainChoces
