import { Link } from "react-router-dom";
import s from "../assets/css/booking.module.css";
import BusSchema from "./BusSchema";
import Legend from "./Legend";
import { SeatMap } from "../util/Models";
import { useLocale } from "../util/useLocale";

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
  const { t, num } = useLocale();
  return (
    <>
      <h2>{t("seats.title")}</h2>
      <p className={s.intro}>{t("seats.intro")}</p>
      {takenSeats.length > 0 && (
        <div className={`${s.notice} ${s.errorNotice}`}>
          {t("errors.codes.seats_unavailable", {
            count: takenSeats.length,
            seats: num(takenSeats.join(t("common.listSeparator"))),
          })}
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
              {t("common.retry")}
            </button>
          </div>
        ) : (
          <div className={s.busPlaceholder}>{t("common.loading")}</div>
        )}
        <Legend className={s.legend} showSelected />
      </div>
      {limitReached && <div className={s.notice}>{t("seats.limit")}</div>}
      <h4>{t("seats.chosenTitle")}</h4>
      <div className={s.chips}>
        {selectedSeats.length === 0 && t("seats.noneChosen")}
        {selectedSeats.map((seatNumber) => (
          <button key={seatNumber} className={s.chip} onClick={() => onToggleSeat(seatNumber)}>
            <i className="fas fa-times" />
            {t("seats.seatNumber", { number: num(seatNumber) })}
          </button>
        ))}
      </div>
      <div className={s.actions}>
        <Link className={s.plain} to={resultsLink}>
          {t("seats.backToResults")}
        </Link>
        <button className={s.primary} disabled={selectedSeats.length === 0} onClick={onContinue}>
          {t("seats.continue")}
        </button>
      </div>
    </>
  );
};

export default SeatPicker;
