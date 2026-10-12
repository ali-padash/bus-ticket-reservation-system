import s from "../assets/css/booking.module.css";
import { getWeekdayName, parseDate, putComma, toPersianNum, turnToDate } from "../util/Function";

// The props are plain values, not a trip object, because two different pages fill this box:
// the booking page from a search result, and the ticket page from a ticket.
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
  const day = parseDate(date);
  return (
    <aside className={`${s.card} ${s.summary}`}>
      <h3>اطلاعات سرویس</h3>
      <div className={s.summaryRoute}>
        {originName}
        <i className="fas fa-arrow-left" />
        {destinationName}
      </div>
      <div className={s.summaryTerminals}>
        <div className={s.summaryRow}>
          <span>مبدأ:</span>
          <strong>پایانه {originTerminal}</strong>
        </div>
        <div className={s.summaryRow}>
          <span>مقصد:</span>
          <strong>پایانه {destinationTerminal}</strong>
        </div>
      </div>
      <div className={s.summarySmall}>{company}</div>
      <div className={s.summarySmall}>{busType}</div>
      <div className={s.summaryRow}>
        <span>تاریخ:</span>
        {day && getWeekdayName(day)} {turnToDate(date)}
      </div>
      <div className={s.summaryRow}>
        <span>ساعت:</span>
        {toPersianNum(time)}
      </div>
      <div className={s.summaryRow}>
        <span>قیمت:</span>
        {toPersianNum(putComma(price))} ریال
      </div>
      {availableSeats !== undefined && (
        <div className={s.summarySeats}>
          <strong>{toPersianNum(availableSeats)}</strong>
          صندلی خالی
        </div>
      )}
    </aside>
  );
};

export default TripSummary;
