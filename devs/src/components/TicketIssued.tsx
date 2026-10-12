import { Link } from "react-router-dom";
import s from "../assets/css/booking.module.css";
import BookingSteps from "./BookingSteps";
import { Ticket } from "../util/Models";
import { getWeekdayName, parseDate, toPersianNum, turnToDate } from "../util/Function";

interface Props {
  ticket: Ticket;
}

// Step 5 when the payment went through: the ticket itself.
const TicketIssued = ({ ticket }: Props) => {
  const trip = ticket.Trip;
  const day = parseDate(trip.DepartureDate);
  return (
    <div className={`${s.card} ${s.centred} ${s.issued}`}>
      <BookingSteps current={5} />
      <i className={`fas fa-check-circle ${s.bigIcon}`} />
      <h2>بلیط شما صادر شد</h2>
      <p>کد بلیط</p>
      <div className={s.code}>{toPersianNum(ticket.Code)}</div>
      <p>این کد را همراه با شماره موبایل خود نگه دارید.</p>
      <div className={s.ticketDetails}>
        <div className={s.box}>
          <div className={s.priceRow}>
            <span>مسیر :</span>
            <span>
              {trip.OriginPersianName} (پایانه {trip.OriginTerminalPersianName}) به {trip.DestinationPersianName} (پایانه{" "}
              {trip.DestinationTerminalPersianName})
            </span>
          </div>
          <div className={s.priceRow}>
            <span>تاریخ و ساعت :</span>
            <span>
              {day && getWeekdayName(day)} {turnToDate(trip.DepartureDate)} - {toPersianNum(trip.DepartureTime)}
            </span>
          </div>
          <div className={s.priceRow}>
            <span>شرکت :</span>
            <span>
              {trip.CompanyPersianName} - {toPersianNum(trip.BusType)}
            </span>
          </div>
          <table className={s.table}>
            <thead>
              <tr>
                <th>صندلی</th>
                <th>نام مسافر</th>
                <th>کدملی</th>
              </tr>
            </thead>
            <tbody>
              {ticket.Passengers.map((passenger) => (
                <tr key={passenger.SeatNumber}>
                  <td>{toPersianNum(passenger.SeatNumber)}</td>
                  <td>
                    {passenger.FirstName} {passenger.LastName}
                  </td>
                  <td>{toPersianNum(passenger.NationalCode)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <div className={s.centredActions}>
        <Link className={`${s.primary} ${s.buttonLink}`} to="/">
          بازگشت به صفحه اصلی
        </Link>
      </div>
    </div>
  );
};

export default TicketIssued;
