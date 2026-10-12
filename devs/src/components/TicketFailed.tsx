import { Link } from "react-router-dom";
import s from "../assets/css/booking.module.css";
import BookingSteps from "./BookingSteps";

interface Props {
  // Why no ticket was issued: the buyer cancelled, or the 10 minutes ran out.
  reason: "cancelled" | "expired";
  resultsLink: string;
}

// Step 5 when there is no ticket. No money moves on this site, so the page says what really
// happened: the seats were released.
const TicketFailed = ({ reason, resultsLink }: Props) => {
  return (
    <div className={`${s.card} ${s.centred} ${s.failed}`}>
      <BookingSteps current={5} />
      <i className={`fas fa-exclamation-circle ${s.bigIcon}`} />
      <h2>خطا در صدور بلیط</h2>
      <p>
        {reason === "cancelled"
          ? "خرید لغو شد و صندلی‌ها آزاد شدند."
          : "مهلت ۱۰ دقیقه‌ای پرداخت به پایان رسید و صندلی‌ها آزاد شدند."}
      </p>
      <p>هیچ مبلغی از شما دریافت نشده است.</p>
      <div className={s.centredActions}>
        <Link className={`${s.pay} ${s.buttonLink}`} to={resultsLink}>
          بازگشت به صفحه سرویس
        </Link>
        <Link className={s.plain} to="/">
          جستجوی مجدد سرویس
        </Link>
      </div>
    </div>
  );
};

export default TicketFailed;
