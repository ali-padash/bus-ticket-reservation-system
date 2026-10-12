import { Link } from "react-router-dom";
import s from "../assets/css/booking.module.css";
import BookingSteps from "./BookingSteps";
import { useLocale } from "../util/useLocale";

interface Props {
  // Why no ticket was issued: the buyer cancelled, or the 10 minutes ran out.
  reason: "cancelled" | "expired";
  resultsLink: string;
}

// Step 5 when there is no ticket. No money moves on this site, so the page says what really
// happened: the seats were released. The two reasons use the same sentences as the API's
// error codes of the same meaning.
const TicketFailed = ({ reason, resultsLink }: Props) => {
  const { t, path } = useLocale();
  return (
    <div className={`${s.card} ${s.centred} ${s.failed}`}>
      <BookingSteps current={5} />
      <i className={`fas fa-exclamation-circle ${s.bigIcon}`} />
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
