import s from "../assets/css/booking.module.css";
import { parseDate } from "../util/Function";
import { shortDate, weekdayName } from "../util/Locale";
import { useLocale } from "../util/useLocale";
import Icon from "./Icon";

// The props are plain values, not a trip object, because two different pages fill this box:
// the booking page from a trip, and the ticket page from a ticket. The names and the bus type
// arrive already in the page's language; the date, time and price are formatted here.
// (updated 2026-10-12)
interface Props {
  originName: string;
  destinationName: string;
  originTerminal: string;
  destinationTerminal: string;
  company: string;
  busType: string;
  date: string; // YYYY-MM-DD
  time: string;
  price: number;
  availableSeats?: number;
}

const TripSummary = ({
  originName,
  destinationName,
  originTerminal,
  destinationTerminal,
  company,
  busType,
  date,
  time,
  price,
  availableSeats,
}: Props) => {
  const l = useLocale();
  const { t } = l;
  const day = parseDate(date);
  return (
    <aside className={`${s.card} ${s.summary}`}>
      <h3>{t("summary.title")}</h3>
      <div className={s.summaryRoute}>
        {originName}
        <Icon name={l.icons.arrow} />
        {destinationName}
      </div>
      <div className={s.summaryTerminals}>
        <div className={s.summaryRow}>
          <span>{t("summary.origin")}</span>
          <strong>{t("common.terminal", { name: originTerminal })}</strong>
        </div>
        <div className={s.summaryRow}>
          <span>{t("summary.destination")}</span>
          <strong>{t("common.terminal", { name: destinationTerminal })}</strong>
        </div>
      </div>
      <div className={s.summarySmall}>{company}</div>
      <div className={s.summarySmall}>{busType}</div>
      <div className={s.summaryRow}>
        <span>{t("summary.date")}</span>
        {day && weekdayName(l.lang, day)} {shortDate(l.lang, date)}
      </div>
      <div className={s.summaryRow}>
        <span>{t("summary.time")}</span>
        {l.num(time)}
      </div>
      <div className={s.summaryRow}>
        <span>{t("summary.price")}</span>
        {l.price(price)}
      </div>
      {availableSeats !== undefined && (
        <div className={s.summarySeats}>
          <strong>{l.num(availableSeats)}</strong>
          {t("summary.freeSeats", { count: availableSeats })}
        </div>
      )}
    </aside>
  );
};

export default TripSummary;
