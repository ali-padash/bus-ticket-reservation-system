import { useState } from "react";
import s from "../assets/css/booking.module.css";
import { isValidPhone, toLatinDigits } from "../util/Validation";

interface Props {
  // True when a phone was tried and no ticket has this code with that phone.
  notFound: boolean;
  onSubmit: (phone: string) => void;
}

// Shown when the ticket's address is opened without the phone at hand: in a new tab, or
// from a link. A ticket only opens with its code and the buyer's phone together.
const PhonePrompt = ({ notFound, onSubmit }: Props) => {
  const [phone, setPhone] = useState("");
  const [invalid, setInvalid] = useState(false);

  return (
    <form
      className={`${s.card} ${s.centred}`}
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        const latinPhone = toLatinDigits(phone.trim());
        setInvalid(!isValidPhone(latinPhone));
        if (isValidPhone(latinPhone)) onSubmit(latinPhone);
      }}>
      <i className={`fas fa-ticket-alt ${s.bigIcon}`} />
      <h2>مشاهده بلیط</h2>
      <p>برای مشاهده بلیط، شماره موبایلی را که هنگام خرید وارد کرده‌اید بنویسید.</p>
      <div className={`${s.field} ${s.phoneField} ${invalid ? s.invalid : ""}`} style={{ margin: "14px auto 0" }}>
        <input
          type="tel"
          placeholder="شماره موبایل"
          aria-label="شماره موبایل"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
        />
        {invalid && <p className={s.fieldError}>شماره موبایل باید ۱۱ رقم باشد و با ۰۹ شروع شود</p>}
      </div>
      {notFound && !invalid && (
        <div className={`${s.notice} ${s.errorNotice}`}>بلیطی با این کد و شماره موبایل پیدا نشد.</div>
      )}
      <div className={s.centredActions}>
        <button type="submit" className={s.primary}>
          مشاهده بلیط
        </button>
      </div>
    </form>
  );
};

export default PhonePrompt;
