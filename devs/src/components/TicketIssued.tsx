import { Link } from "react-router-dom";
import s from "../assets/css/booking.module.css";
import BookingSteps from "./BookingSteps";
import { Ticket } from "../util/Models";
import { parseDate } from "../util/Function";
import { shortDate, weekdayName } from "../util/Locale";
import { useLocale } from "../util/useLocale";
import Icon from "./Icon";

interface Props {
  ticket: Ticket;
}

// Step 5 when the payment went through: the ticket itself.
const TicketIssued = ({ ticket }: Props) => {
  const { lang, t, num, name, text, path } = useLocale();
  const trip = ticket.Trip;
  const day = parseDate(trip.DepartureDate);
  return (
    <div className={`${s.card} ${s.centred} ${s.issued}`}>
      <BookingSteps current={5} />
      <Icon name="check-circle" className={s.bigIcon} />
      <h2>{t("issued.title")}</h2>
      <p>{t("issued.codeLabel")}</p>
      <div className={s.code}>{num(ticket.Code)}</div>
      <p>{t("issued.keepCode")}</p>
      <div className={s.ticketDetails}>
        <div className={s.box}>
          <div className={s.priceRow}>
            <span>{t("issued.route")}</span>
            <span>
              {t("issued.routeValue", {
                origin: name(trip.OriginPersianName, trip.OriginEnglishName),
                originTerminal: name(trip.OriginTerminalPersianName, trip.OriginTerminalName),
                destination: name(trip.DestinationPersianName, trip.DestinationEnglishName),
                destinationTerminal: name(trip.DestinationTerminalPersianName, trip.DestinationTerminalName),
              })}
            </span>
          </div>
          <div className={s.priceRow}>
            <span>{t("issued.dateTime")}</span>
            <span>
              {t("issued.dateTimeValue", {
                weekday: day ? weekdayName(lang, day) : "",
                date: shortDate(lang, trip.DepartureDate),
                time: num(trip.DepartureTime),
              })}
            </span>
          </div>
          <div className={s.priceRow}>
            <span>{t("issued.company")}</span>
            <span>
              {t("issued.companyValue", {
                company: name(trip.CompanyPersianName, trip.CompanyName),
                busType: text(trip.BusType, trip.BusTypeEnglish),
              })}
            </span>
          </div>
          <table className={s.table}>
            <thead>
              <tr>
                <th>{t("review.seat")}</th>
                <th>{t("review.passengerName")}</th>
                <th>{t("review.nationalCode")}</th>
              </tr>
            </thead>
            <tbody>
              {ticket.Passengers.map((passenger) => (
                <tr key={passenger.SeatNumber}>
                  <td>{num(passenger.SeatNumber)}</td>
                  <td>
                    {passenger.FirstName} {passenger.LastName}
                  </td>
                  <td>{num(passenger.NationalCode)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <div className={s.centredActions}>
        <Link className={`${s.primary} ${s.buttonLink}`} to={path("/")}>
          {t("issued.home")}
        </Link>
      </div>
    </div>
  );
};

export default TicketIssued;
