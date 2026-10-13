import { Link } from "react-router-dom";
import s from "../assets/css/booking.module.css";
import { useLocale } from "../util/useLocale";
import Icon from "./Icon";

interface Props {
  // Why no ticket was issued: the buyer cancelled, or the 10 minutes ran out.
  reason: "cancelled" | "expired";
  resultsLink: string;
}

// Where step 5 would be when there is no ticket. It carries no step line: five lit steps and
// "Step 5 of 5: Ticket" above "the ticket was not issued" said two opposite things.
// (updated 2026-10-13)
// No money moves on this site, so the page says what really happened: the seats were
// released. The two reasons use the same sentences as the API's error codes of the same
// meaning.
const TicketFailed = ({ reason, resultsLink }: Props) => {
  const { t, path } = useLocale();
  return (
    <div className={`${s.card} ${s.centred} ${s.failed}`}>
      <Icon name="exclamation-circle" className={s.bigIcon} />
      <h2>{t("failed.title")}</h2>
      <p>{t(reason === "cancelled" ? "errors.codes.ticket_cancelled" : "errors.codes.hold_expired")}</p>
      <p>{t("failed.noCharge")}</p>
      <div className={s.centredActions}>
        <Link className={`${s.pay} ${s.buttonLink}`} to={resultsLink}>
          {t("failed.backToResults")}
        </Link>
        <Link className={s.plain} to={path("/")}>
          {t("booking.searchAgain")}
        </Link>
      </div>
    </div>
  );
};

export default TicketFailed;
