import s from "../assets/css/booking.module.css";
import DigitInput from "./DigitInput";
import { useLocale } from "../util/useLocale";
import { FieldErrors, PassengerDraft, emptyPassenger } from "../util/Validation";

interface Props {
  seats: number[];
  contactPhone: string;
  setContactPhone: (phone: string) => void;
  // What has been typed so far, by seat number.
  passengers: { [seatNumber: number]: PassengerDraft };
  setPassenger: (seatNumber: number, passenger: PassengerDraft) => void;
  // Message names by field name: "ContactPhone", or "Passengers[0].NationalCode" for the first
  // seat. The sentence for a name is in the text files, under `errors.fields`.
  fieldErrors: FieldErrors;
  // The place of a sentence in the text files, for example "errors.codes.trip_departed".
  submitError: string | null;
  submitting: boolean;
  onSubmit: () => void;
  onBack: () => void;
}

// Step 3: one mobile number for the buyer, then the details of the passenger in each seat.
const PassengerForm = ({
  seats,
  contactPhone,
  setContactPhone,
  passengers,
  setPassenger,
  fieldErrors,
  submitError,
  submitting,
  onSubmit,
  onBack,
}: Props) => {
  const { t, num } = useLocale();
  // The sentence for the fault in one field, in the language of the page.
  const message = (field: string) => (fieldErrors[field] ? t(`errors.fields.${fieldErrors[field]}`) : undefined);
  return (
    <form
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}>
      <h2>{t("passengers.title")}</h2>
      <p className={s.intro}>{t("passengers.intro")}</p>
      <div className={`${s.field} ${s.phoneField} ${fieldErrors.ContactPhone ? s.invalid : ""}`}>
        <DigitInput type="tel" label={t("passengers.phone")} value={contactPhone} onChange={setContactPhone} />
        {message("ContactPhone") && <p className={s.fieldError}>{message("ContactPhone")}</p>}
      </div>
      {seats.map((seatNumber, index) => {
        const passenger = passengers[seatNumber] ?? emptyPassenger;
        const errorOf = (name: keyof PassengerDraft | "SeatNumber") => message(`Passengers[${index}].${name}`);
        // The two name boxes are ordinary text boxes. The two number boxes show the digits of
        // the page's language as the visitor types. (updated 2026-10-12)
        const textField = (name: "FirstName" | "LastName" | "NationalCode" | "BirthDate", label: string) => (
          <div className={`${s.field} ${errorOf(name) ? s.invalid : ""}`}>
            {name === "NationalCode" || name === "BirthDate" ? (
              <DigitInput
                label={label}
                value={passenger[name]}
                onChange={(text) => setPassenger(seatNumber, { ...passenger, [name]: text })}
              />
            ) : (
              <input
                type="text"
                placeholder={label}
                aria-label={label}
                value={passenger[name]}
                onChange={(e) => setPassenger(seatNumber, { ...passenger, [name]: e.target.value })}
              />
            )}
            {errorOf(name) && <p className={s.fieldError}>{errorOf(name)}</p>}
          </div>
        );
        return (
          <div className={s.passengerBlock} key={seatNumber}>
            <h4>{t("passengers.seatHeading", { number: num(seatNumber) })}</h4>
            <div className={s.fields}>
              {textField("FirstName", t("passengers.firstName"))}
              {textField("LastName", t("passengers.lastName"))}
              {textField("NationalCode", t("passengers.nationalCode"))}
              {textField("BirthDate", t("passengers.birthDate"))}
              <div className={`${s.field} ${errorOf("Gender") ? s.invalid : ""}`}>
                <select
                  aria-label={t("passengers.gender")}
                  value={passenger.Gender}
                  onChange={(e) => {
                    const gender = e.target.value === "M" || e.target.value === "F" ? e.target.value : "";
                    setPassenger(seatNumber, { ...passenger, Gender: gender });
                  }}>
                  <option value="">{t("passengers.gender")}</option>
                  <option value="M">{t("passengers.male")}</option>
                  <option value="F">{t("passengers.female")}</option>
                </select>
                {errorOf("Gender") && <p className={s.fieldError}>{errorOf("Gender")}</p>}
              </div>
            </div>
            {errorOf("SeatNumber") && <p className={s.fieldError}>{errorOf("SeatNumber")}</p>}
          </div>
        );
      })}
      <p className={s.hint}>{t("passengers.idHint")}</p>
      {message("Passengers") && <div className={`${s.notice} ${s.errorNotice}`}>{message("Passengers")}</div>}
      {submitError && <div className={`${s.notice} ${s.errorNotice}`}>{t(submitError)}</div>}
      <div className={s.actions}>
        <button type="button" className={s.plain} onClick={onBack}>
          {t("passengers.back")}
        </button>
        <button type="submit" className={s.primary} disabled={submitting}>
          {t("passengers.submit")}
        </button>
      </div>
    </form>
  );
};

export default PassengerForm;
