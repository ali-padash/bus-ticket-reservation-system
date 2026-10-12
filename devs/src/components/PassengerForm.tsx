import s from "../assets/css/booking.module.css";
import DigitInput from "./DigitInput";
import { useLocale } from "../util/useLocale";
import { formatBirthDate } from "../util/Locale";
import { FieldErrors, PassengerDraft, emptyPassenger } from "../util/Validation";
import { SavedPassenger } from "../util/SavedPassengers";

interface Props {
  seats: number[];
  contactPhone: string;
  setContactPhone: (phone: string) => void;
  // What has been typed so far, by seat number.
  passengers: { [seatNumber: number]: PassengerDraft };
  setPassenger: (seatNumber: number, passenger: PassengerDraft) => void;
  // The phone and the passengers this browser remembers from an earlier purchase. They are
  // offered under each box as the buyer types, and one click on a name fills the boxes of a
  // seat. (updated 2026-10-13)
  savedPhone: string;
  savedPassengers: SavedPassenger[];
  fillPassenger: (seatNumber: number, passenger: SavedPassenger) => void;
  // Whether the visitor wants this browser to remember the passengers after this purchase.
  remember: boolean;
  setRemember: (remember: boolean) => void;
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
  savedPhone,
  savedPassengers,
  fillPassenger,
  remember,
  setRemember,
  fieldErrors,
  submitError,
  submitting,
  onSubmit,
  onBack,
}: Props) => {
  const { t, num, lang } = useLocale();
  // The sentence for the fault in one field, in the language of the page.
  const message = (field: string) => (fieldErrors[field] ? t(`errors.fields.${fieldErrors[field]}`) : undefined);
  // Earlier entries, offered under each box the way a browser offers its own form history.
  // A <datalist> is used so the list, its filtering as the buyer types and its keyboard keys
  // are the browser's own. Each entry is written as its box shows it (the page's digits and
  // calendar) and carries the passenger's full name as a hint. (added 2026-10-13)
  const fullName = (saved: SavedPassenger) => `${saved.FirstName} ${saved.LastName}`;
  const suggestions = {
    FirstName: savedPassengers.map((saved) => ({ value: saved.FirstName, hint: fullName(saved) })),
    LastName: savedPassengers.map((saved) => ({ value: saved.LastName, hint: fullName(saved) })),
    NationalCode: savedPassengers.map((saved) => ({ value: num(saved.NationalCode), hint: fullName(saved) })),
    BirthDate: savedPassengers.map((saved) => ({
      value: num(formatBirthDate(lang, saved.BirthDate)),
      hint: fullName(saved),
    })),
  };
  type SuggestedField = keyof typeof suggestions;
  const suggestedFields: SuggestedField[] = ["FirstName", "LastName", "NationalCode", "BirthDate"];
  return (
    <form
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}>
      {savedPhone && (
        <datalist id="saved-tel">
          <option value={num(savedPhone)} />
        </datalist>
      )}
      {suggestedFields.map((field) => (
        <datalist id={`saved-${field}`} key={field}>
          {suggestions[field]
            // A value two passengers share (a family name) is offered once.
            .filter((entry, index, all) => all.findIndex((other) => other.value === entry.value) === index)
            .map((entry) => (
              <option value={entry.value} key={entry.value}>
                {entry.hint}
              </option>
            ))}
        </datalist>
      ))}
      <h2>{t("passengers.title")}</h2>
      <p className={s.intro}>{t("passengers.intro")}</p>
      <div className={`${s.field} ${s.phoneField} ${fieldErrors.ContactPhone ? s.invalid : ""}`}>
        <DigitInput
          type="tel"
          name="tel"
          autoComplete="tel-national"
          list="saved-tel"
          label={t("passengers.phone")}
          value={contactPhone}
          onChange={setContactPhone}
        />
        {message("ContactPhone") && <p className={s.fieldError}>{message("ContactPhone")}</p>}
      </div>
      {seats.map((seatNumber, index) => {
        const passenger = passengers[seatNumber] ?? emptyPassenger;
        const errorOf = (name: keyof PassengerDraft | "SeatNumber") => message(`Passengers[${index}].${name}`);
        // The two name boxes are ordinary text boxes. The two number boxes show the digits of
        // the page's language as the visitor types. (updated 2026-10-12)
        //
        // `name` and `autoComplete` let the browser offer what it already knows. The section
        // word keeps the seats apart, so two passengers are not filled with one person. The
        // national ID has no standard autofill name, so the browser offers what was typed
        // into that box before. (added 2026-10-12)
        const section = `section-seat${seatNumber}`;
        const autofill = {
          FirstName: `${section} given-name`,
          LastName: `${section} family-name`,
          NationalCode: "on",
          BirthDate: `${section} bday`,
        };
        const textField = (name: "FirstName" | "LastName" | "NationalCode" | "BirthDate", label: string) => (
          <div className={`${s.field} ${errorOf(name) ? s.invalid : ""}`}>
            {name === "NationalCode" || name === "BirthDate" ? (
              <DigitInput
                name={`${name}-${seatNumber}`}
                autoComplete={autofill[name]}
                list={`saved-${name}`}
                label={label}
                value={passenger[name]}
                onChange={(text) => {
                  // A national ID names one person, so once a remembered one is in the box
                  // the rest of that passenger is filled in too. (added 2026-10-13)
                  const known = name === "NationalCode" && savedPassengers.find((saved) => saved.NationalCode === text);
                  if (known) fillPassenger(seatNumber, known);
                  else setPassenger(seatNumber, { ...passenger, [name]: text });
                }}
              />
            ) : (
              <input
                type="text"
                name={`${name}-${seatNumber}`}
                autoComplete={autofill[name]}
                list={`saved-${name}`}
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
            {savedPassengers.length > 0 && (
              <div className={s.savedPassengers}>
                <span>{t("passengers.saved")}</span>
                {savedPassengers.map((saved) => (
                  <button type="button" key={saved.NationalCode} onClick={() => fillPassenger(seatNumber, saved)}>
                    {saved.FirstName} {saved.LastName}
                  </button>
                ))}
              </div>
            )}
            <div className={s.fields}>
              {textField("FirstName", t("passengers.firstName"))}
              {textField("LastName", t("passengers.lastName"))}
              {textField("NationalCode", t("passengers.nationalCode"))}
              {textField("BirthDate", t("passengers.birthDate"))}
              <div className={`${s.field} ${errorOf("Gender") ? s.invalid : ""}`}>
                <select
                  name={`Gender-${seatNumber}`}
                  autoComplete={`${section} sex`}
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
      <label className={s.remember}>
        <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} />
        {t("passengers.remember")}
      </label>
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
