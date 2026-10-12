import { Link } from "react-router-dom";
import s from "../assets/css/booking.module.css";
import BusSchema from "./BusSchema";
import Legend from "./Legend";
import { SeatMap } from "../util/Models";
import { toPersianNum } from "../util/Function";

interface Props {
  seatMap: SeatMap | null;
  seatMapFailed: boolean;
  retry: () => void;
  selectedSeats: number[];
  onToggleSeat: (seatNumber: number) => void;
  // Seats the server refused a moment ago because someone else got them first.
  takenSeats: number[];
  limitReached: boolean;
  onContinue: () => void;
  resultsLink: string;
}

// Step 2: choosing seats. Nothing is sent to the server here; the choice lives in the
// address until the passenger form is submitted.
const SeatPicker = ({
  seatMap,
  seatMapFailed,
  retry,
  selectedSeats,
  onToggleSeat,
  takenSeats,
  limitReached,
  onContinue,
  resultsLink,
}: Props) => {
  return (
    <>
      <h2>انتخاب صندلی</h2>
      <p className={s.intro}>
        لطفا برای انتخاب صندلی، بر روی شماره صندلی‌های مورد نظر خود کلیک کنید. صندلی‌های سفید قابل انتخاب هستند و
        صندلی‌های رنگی قبلا خریداری شده‌اند.
      </p>
      {takenSeats.length > 0 && (
        <div className={`${s.notice} ${s.errorNotice}`}>
          صندلی شماره {toPersianNum(takenSeats.join("، "))} لحظاتی پیش توسط فرد دیگری گرفته شد. لطفا صندلی دیگری انتخاب کنید.
        </div>
      )}
      <div className={s.busArea}>
        {seatMap ? (
          <BusSchema
            layout={seatMap.Layout}
            seats={seatMap.Seats}
            selectedSeats={selectedSeats}
            onToggleSeat={onToggleSeat}
          />
        ) : seatMapFailed ? (
          <div className={s.busPlaceholder}>
            <button className={s.primary} onClick={retry}>
              تلاش مجدد
            </button>
          </div>
        ) : (
          <div className={s.busPlaceholder}>در حال بارگذاری ...</div>
        )}
        <Legend className={s.legend} showSelected />
      </div>
      {limitReached && <div className={s.notice}>حداکثر ۴ صندلی در هر خرید قابل انتخاب است.</div>}
      <h4>صندلی انتخابی شما برای سفر</h4>
      <div className={s.chips}>
        {selectedSeats.length === 0 && "هنوز صندلی انتخاب نشده است."}
        {selectedSeats.map((seatNumber) => (
          <button key={seatNumber} className={s.chip} onClick={() => onToggleSeat(seatNumber)}>
            <i className="fas fa-times" />
            صندلی شماره {toPersianNum(seatNumber)}
          </button>
        ))}
      </div>
      <div className={s.actions}>
        <Link className={s.plain} to={resultsLink}>
          بازگشت به لیست سرویس‌ها
        </Link>
        <button className={s.primary} disabled={selectedSeats.length === 0} onClick={onContinue}>
          انتخاب صندلی و ثبت مشخصات مسافر
        </button>
      </div>
    </>
  );
};

export default SeatPicker;
