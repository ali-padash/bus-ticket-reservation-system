import Seat from "./Seat";
import { useLocale } from "../util/useLocale";

interface Props {
  className: string;
  // The booking page also explains the green "your choice" seat.
  showSelected?: boolean;
}

const Legend = ({ className, showSelected = false }: Props) => {
  const { t } = useLocale();
  return (
    <div className={className}>
      <div>
        <Seat size="20px" seatNumber={null} status="M" /> {t("seatMap.boughtForMen")}
      </div>
      <div>
        <Seat size="20px" seatNumber={null} status="F" /> {t("seatMap.boughtForWomen")}
      </div>
      <div>
        <Seat size="20px" seatNumber={null} status="N" /> {t("seatMap.notForSale")}
      </div>
      {showSelected && (
        <div>
          <Seat size="20px" seatNumber={null} status="S" /> {t("seatMap.yourChoice")}
        </div>
      )}
      <div>
        <Seat size="20px" seatNumber={null} status={null} /> {t("seatMap.available")}
      </div>
    </div>
  );
};

export default Legend;
