import s from "../assets/css/busDetails.module.css";
import { SeatMap } from "../util/Models";
import BusLoading from "./BusLoading";
import BusSchemaError from "./BusDisplayError";
import BusDetailsDisplay from "./BusDetailsDisplay";

interface Props {
  showDetails: boolean;
  setShowDetails: (showDetails: boolean) => void;
  // The trip card loads the seat map and hands it over; this only decides what to show.
  seatMap: SeatMap | null;
  errorFetching: boolean;
  retry: () => void;
  onBuy: () => void;
}

const BusDetails = ({ showDetails, setShowDetails, seatMap, errorFetching, retry, onBuy }: Props) => {
  const busDetailsClasses = `${s.busDetails} ${showDetails ? s.show : ""}`;

  return (
    <div className={busDetailsClasses}>
      {seatMap ? (
        <BusDetailsDisplay seatMap={seatMap} setShowDetails={setShowDetails} onBuy={onBuy} />
      ) : !errorFetching ? (
        <BusLoading />
      ) : (
        <BusSchemaError retry={retry} />
      )}
    </div>
  );
};

export default BusDetails;
