import { useEffect, useState } from "react";
import s from "../assets/css/booking.module.css";
import RefundItem from "./RefundItem";
import { RefundRule, Ticket } from "../util/Models";
import { fetchRefundRules } from "../util/FetchFunction";
import { putComma, toPersianNum } from "../util/Function";

interface Props {
  ticket: Ticket;
  // Seconds the hold still has, already counted down by the page.
  secondsLeft: number;
  busy: boolean;
  actionError: string | null;
  onPay: () => void;
  onCancel: () => void;
}

// "599" -> "۰۹:۵۹"
const formatCountdown = (seconds: number) => {
  const minutes = Math.floor(seconds / 60);
  return toPersianNum(`${String(minutes).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`);
};

// The rules arrive ordered from the most notice to the least. Each is read against the one
// before it: "up to 1 hour before departure", then "less than 1 hour to departure".
const describeRule = (rule: RefundRule, previous: RefundRule | undefined) => {
  if (rule.MinHoursBeforeDeparture > 0) return `تا ${toPersianNum(rule.MinHoursBeforeDeparture)} ساعت قبل حرکت`;
  if (previous) return `کمتر از ${toPersianNum(previous.MinHoursBeforeDeparture)} ساعت به حرکت`;
  return "تا لحظه حرکت";
};

// Step 4: the last look before paying. The seats are already on hold at this point.
const TicketReview = ({ ticket, secondsLeft, busy, actionError, onPay, onCancel }: Props) => {
  const [refundRules, setRefundRules] = useState<RefundRule[]>([]);

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
      <h2>اطلاعات سفر و پرداخت</h2>
      <p className={s.intro}>
        این آخرین مرحله‌ای است که در آن امکان بررسی اطلاعات وجود دارد، پس لطفا یک‌بار دیگر مشخصات را بررسی کنید.
      </p>
      <div className={`${s.notice} ${s.countdown}`}>
        <span>صندلی‌های شما تا پایان این زمان نگه داشته می‌شوند. زمان باقی‌مانده برای پرداخت:</span>
        <strong>{formatCountdown(secondsLeft)}</strong>
      </div>
      <div className={s.reviewGrid}>
        <div className={s.box}>
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
          <div className={s.priceRow}>
            <span>تلفن همراه :</span>
            <span>{toPersianNum(ticket.ContactPhone)}</span>
          </div>
        </div>
        <div className={s.box}>
          <div className={s.priceRow}>
            <span>قیمت صندلی :</span>
            <span>{toPersianNum(putComma(ticket.PricePerSeat))} ریال</span>
          </div>
          <div className={s.priceRow}>
            <span>تعداد صندلی :</span>
            <span>{toPersianNum(ticket.Passengers.length)} صندلی</span>
          </div>
          <div className={`${s.priceRow} ${s.total}`}>
            <span>قابل پرداخت :</span>
            <span>{toPersianNum(putComma(ticket.TotalPrice))} ریال</span>
          </div>
        </div>
      </div>
      {refundRules.length > 0 && (
        <div className={s.box} style={{ marginTop: "16px" }}>
          <h4>شرایط استرداد</h4>
          <p>
            در صورت کنسلی بلیط به صورت آنلاین توسط شما، هزینه استرداد طبق شرایط زیر توسط شرکت مسافربری از مبلغ بلیط کسر
            خواهد شد.
          </p>
          <div style={{ maxWidth: "370px" }}>
            {refundRules.map((rule, index) => (
              <RefundItem key={rule.MinHoursBeforeDeparture} title={toPersianNum(rule.PenaltyPercent) ?? ""}>
                {describeRule(rule, refundRules[index - 1])}
              </RefundItem>
            ))}
          </div>
        </div>
      )}
      {actionError && <div className={`${s.notice} ${s.errorNotice}`}>{actionError}</div>}
      <div className={s.actions}>
        <button className={s.plain} disabled={busy} onClick={onCancel}>
          انصراف از خرید
        </button>
        <button className={s.pay} disabled={busy} onClick={onPay}>
          تایید قوانین و پرداخت
        </button>
      </div>
    </>
  );
};

export default TicketReview;
