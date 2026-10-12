import s from "../assets/css/booking.module.css";
import DigitInput from "./DigitInput";
import { toPersianNum } from "../util/Function";
import { FieldErrors, PassengerDraft, emptyPassenger } from "../util/Validation";

interface Props {
  seats: number[];
  contactPhone: string;
  setContactPhone: (phone: string) => void;
  // What has been typed so far, by seat number.
  passengers: { [seatNumber: number]: PassengerDraft };
  setPassenger: (seatNumber: number, passenger: PassengerDraft) => void;
  // Messages by field name: "ContactPhone", or "Passengers[0].NationalCode" for the first seat.
  fieldErrors: FieldErrors;
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
  return (
    <form
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}>
      <h2>ثبت مشخصات مسافر</h2>
      <p className={s.intro}>
        برای تکمیل فرآیند خرید، باید اطلاعات مسافران را وارد نمایید. بلیط با شماره موبایلی که وارد می‌کنید قابل پیگیری
        است؛ پس شماره موبایل خود را با دقت وارد کنید.
      </p>
      <div className={`${s.field} ${s.phoneField} ${fieldErrors.ContactPhone ? s.invalid : ""}`}>
        <DigitInput type="tel" label="شماره موبایل" value={contactPhone} onChange={setContactPhone} />
        {fieldErrors.ContactPhone && <p className={s.fieldError}>{fieldErrors.ContactPhone}</p>}
      </div>
      {seats.map((seatNumber, index) => {
        const passenger = passengers[seatNumber] ?? emptyPassenger;
        const errorOf = (name: keyof PassengerDraft) => fieldErrors[`Passengers[${index}].${name}`];
        // The two name boxes are ordinary text boxes. The two number boxes show Persian digits
        // as the visitor types.
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
            <h4>اطلاعات مسافر صندلی شماره {toPersianNum(seatNumber)}</h4>
            <div className={s.fields}>
              {textField("FirstName", "نام")}
              {textField("LastName", "نام خانوادگی")}
              {textField("NationalCode", "کدملی")}
              {textField("BirthDate", "تاریخ تولد (۱۳۷۴/۰۱/۲۱)")}
              <div className={`${s.field} ${errorOf("Gender") ? s.invalid : ""}`}>
                <select
                  aria-label="جنسیت"
                  value={passenger.Gender}
                  onChange={(e) => {
                    const gender = e.target.value === "M" || e.target.value === "F" ? e.target.value : "";
                    setPassenger(seatNumber, { ...passenger, Gender: gender });
                  }}>
                  <option value="">جنسیت</option>
                  <option value="M">مرد</option>
                  <option value="F">زن</option>
                </select>
                {errorOf("Gender") && <p className={s.fieldError}>{errorOf("Gender")}</p>}
              </div>
            </div>
            {fieldErrors[`Passengers[${index}].SeatNumber`] && (
              <p className={s.fieldError}>{fieldErrors[`Passengers[${index}].SeatNumber`]}</p>
            )}
          </div>
        );
      })}
      <p className={s.hint}>
        مسافر گرامی هنگام سوار شدن ارائه کارت ملی منطبق با کد ملی های درج شده الزامی است.
      </p>
      {fieldErrors.Passengers && <div className={`${s.notice} ${s.errorNotice}`}>{fieldErrors.Passengers}</div>}
      {submitError && <div className={`${s.notice} ${s.errorNotice}`}>{submitError}</div>}
      <div className={s.actions}>
        <button type="button" className={s.plain} onClick={onBack}>
          بازگشت به مرحله قبلی
        </button>
        <button type="submit" className={s.primary} disabled={submitting}>
          تکمیل خرید و پرداخت
        </button>
      </div>
    </form>
  );
};

export default PassengerForm;
