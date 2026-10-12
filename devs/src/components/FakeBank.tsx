import s from "../assets/css/booking.module.css";
import { Ticket } from "../util/Models";
import { putComma, toPersianNum } from "../util/Function";

interface Props {
  ticket: Ticket;
  busy: boolean;
  actionError: string | null;
  onPay: () => void;
  onCancel: () => void;
}

// Stands in for a bank's payment page. It says plainly that it is a demo: no card details
// are asked for and no money moves. "Pay" and "cancel" call the API the way a real bank's
// answer would.
const FakeBank = ({ ticket, busy, actionError, onPay, onCancel }: Props) => {
  return (
    <div className={`${s.card} ${s.centred}`}>
      <i className={`fas fa-university ${s.bigIcon}`} />
      <h2>درگاه پرداخت آزمایشی</h2>
      <div className={s.notice}>
        این صفحه یک نمونه آزمایشی است. هیچ پولی جابه‌جا نمی‌شود و اطلاعات بانکی از شما خواسته نمی‌شود.
      </div>
      <p>مبلغ قابل پرداخت</p>
      <div className={s.code}>{toPersianNum(putComma(ticket.TotalPrice))}</div>
      <p>ریال</p>
      {actionError && <div className={`${s.notice} ${s.errorNotice}`}>{actionError}</div>}
      <div className={s.centredActions}>
        <button className={s.pay} disabled={busy} onClick={onPay}>
          پرداخت
        </button>
        <button className={s.plain} disabled={busy} onClick={onCancel}>
          انصراف
        </button>
      </div>
    </div>
  );
};

export default FakeBank;
