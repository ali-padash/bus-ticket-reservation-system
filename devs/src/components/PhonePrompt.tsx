import { useState } from "react";
import s from "../assets/css/booking.module.css";
import DigitInput from "./DigitInput";
import { toLatinDigits } from "../util/Locale";
import { isValidPhone } from "../util/Validation";
import { useLocale } from "../util/useLocale";
import Icon from "./Icon";

interface Props {
  // True when a phone was tried and no ticket has this code with that phone.
  notFound: boolean;
  onSubmit: (phone: string) => void;
}

// Shown when the ticket's address is opened without the phone at hand: in a new tab, or
// from a link. A ticket only opens with its code and the buyer's phone together.
const PhonePrompt = ({ notFound, onSubmit }: Props) => {
  const { t } = useLocale();
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
      <Icon name="ticket-alt" className={s.bigIcon} />
      <h2>{t("phonePrompt.title")}</h2>
      <p>{t("phonePrompt.intro")}</p>
      <div className={`${s.field} ${s.phoneField} ${invalid ? s.invalid : ""}`} style={{ margin: "14px auto 0" }}>
        <DigitInput type="tel" name="tel" autoComplete="tel-national" label={t("passengers.phone")} value={phone} onChange={setPhone} />
        {invalid && <p className={s.fieldError}>{t("errors.fields.ContactPhone")}</p>}
      </div>
      {notFound && !invalid && (
        <div className={`${s.notice} ${s.errorNotice}`}>{t("errors.codes.ticket_not_found")}</div>
      )}
      <div className={s.centredActions}>
        <button type="submit" className={s.primary}>
          {t("phonePrompt.title")}
        </button>
      </div>
    </form>
  );
};

export default PhonePrompt;
