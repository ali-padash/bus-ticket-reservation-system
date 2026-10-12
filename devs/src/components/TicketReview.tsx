import { useEffect, useState } from "react";
import s from "../assets/css/booking.module.css";
import RefundItem from "./RefundItem";
import { RefundRule, Ticket } from "../util/Models";
import { fetchRefundRules } from "../util/FetchFunction";
import { useLocale } from "../util/useLocale";

interface Props {
  ticket: Ticket;
  // Seconds the hold still has, already counted down by the page.
  secondsLeft: number;
  busy: boolean;
  // The place of a sentence in the text files, for example "errors.codes.unknown".
  actionError: string | null;
  onPay: () => void;
  onCancel: () => void;
}

// 599 -> "09:59"
const formatCountdown = (seconds: number) => {
  const minutes = Math.floor(seconds / 60);
  return `${String(minutes).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
};

// Step 4: the last look before paying. The seats are already on hold at this point.
const TicketReview = ({ ticket, secondsLeft, busy, actionError, onPay, onCancel }: Props) => {
  const { t, num, price } = useLocale();
  const [refundRules, setRefundRules] = useState<RefundRule[]>([]);

  // The rules arrive ordered from the most notice to the least. Each is read against the one
  // before it: "up to 1 hour before departure", then "less than 1 hour before departure".
  const describeRule = (rule: RefundRule, previous: RefundRule | undefined) => {
    const hours = (count: number) => ({ count, hours: num(count) });
    if (rule.MinHoursBeforeDeparture > 0) return t("refund.upTo", hours(rule.MinHoursBeforeDeparture));
    if (previous) return t("refund.lessThan", hours(previous.MinHoursBeforeDeparture));
    return t("refund.untilDeparture");
  };

  useEffect(() => {
    const abortController = new AbortController();
    fetchRefundRules(ticket.Trip.ID, abortController.signal)
      .then((rules) => setRefundRules(rules))
      // The rules are extra information. If they cannot be loaded the box stays empty and
      // the purchase can still go on.
      .catch(() => setRefundRules([]));
    return () => abortController.abort();
  }, [ticket.Trip.ID]);

  return (
    <>
      <h2>{t("review.title")}</h2>
      <p className={s.intro}>{t("review.intro")}</p>
      <div className={`${s.notice} ${s.countdown}`}>
        <span>{t("review.countdown")}</span>
        <strong>{num(formatCountdown(secondsLeft))}</strong>
      </div>
      <div className={s.reviewGrid}>
        <div className={s.box}>
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
          <div className={s.priceRow}>
            <span>{t("review.phone")}</span>
            <span>{num(ticket.ContactPhone)}</span>
          </div>
        </div>
        <div className={s.box}>
          <div className={s.priceRow}>
            <span>{t("review.seatPrice")}</span>
            <span>{price(ticket.PricePerSeat)}</span>
          </div>
          <div className={s.priceRow}>
            <span>{t("review.seatCountLabel")}</span>
            <span>{t("review.seatCount", { count: ticket.Passengers.length, number: num(ticket.Passengers.length) })}</span>
          </div>
          <div className={`${s.priceRow} ${s.total}`}>
            <span>{t("review.total")}</span>
            <span>{price(ticket.TotalPrice)}</span>
          </div>
        </div>
      </div>
      {refundRules.length > 0 && (
        <div className={s.box} style={{ marginTop: "16px" }}>
          <h4>{t("refund.title")}</h4>
          <p>{t("refund.intro")}</p>
          <div style={{ maxWidth: "370px" }}>
            {refundRules.map((rule, index) => (
              <RefundItem key={rule.MinHoursBeforeDeparture} title={num(rule.PenaltyPercent)}>
                {describeRule(rule, refundRules[index - 1])}
              </RefundItem>
            ))}
          </div>
        </div>
      )}
      {actionError && <div className={`${s.notice} ${s.errorNotice}`}>{t(actionError)}</div>}
      <div className={s.actions}>
        <button className={s.plain} disabled={busy} onClick={onCancel}>
          {t("review.cancel")}
        </button>
        <button className={s.pay} disabled={busy} onClick={onPay}>
          {t("review.pay")}
        </button>
      </div>
    </>
  );
};

export default TicketReview;
