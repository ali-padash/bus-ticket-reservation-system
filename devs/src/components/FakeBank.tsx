import s from "../assets/css/booking.module.css";
import { Ticket } from "../util/Models";
import { useLocale } from "../util/useLocale";

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
  const { t, amount } = useLocale();
  return (
    <div className={`${s.card} ${s.centred}`}>
      <i className={`fas fa-university ${s.bigIcon}`} />
      <h2>{t("bank.title")}</h2>
      <div className={s.notice}>{t("bank.notice")}</div>
      <p>{t("bank.amount")}</p>
      <div className={s.code}>{amount(ticket.TotalPrice)}</div>
      <p>{t("common.rial")}</p>
      {actionError && <div className={`${s.notice} ${s.errorNotice}`}>{t(actionError)}</div>}
      <div className={s.centredActions}>
        <button className={s.pay} disabled={busy} onClick={onPay}>
          {t("bank.pay")}
        </button>
        <button className={s.plain} disabled={busy} onClick={onCancel}>
          {t("bank.cancel")}
        </button>
      </div>
    </div>
  );
};

export default FakeBank;
