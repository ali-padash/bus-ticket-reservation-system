import { useEffect, useMemo, useState } from "react";
import s from "../assets/css/busDetails.module.css";
import { SeatArrayType, SeatType } from "../util/Models";
import { seatsArray_25_1, seatsArray_26_1, seatsArray_29_1, seatsArray_32_1 } from "../util/BusModels";
import BusLoading from "./BusLoading";
import BusSchemaError from "./BusDisplayError";
import BusDetailsDisplay from "./BusDetailsDisplay";
import { fetchSeats } from "../util/FetchFunction";

interface Props {
  serviceID: number;
  busCode: string;
  showDetails: boolean;
  setShowDetails: (showDetails: boolean) => void;
}

// The seat layout for each bus code the API can send. Any other code gives an empty map.
const busLayouts: { [busCode: string]: { column: number; seatsArray: SeatType[] } } = {
  VIP_25_1: { column: 9, seatsArray: seatsArray_25_1 },
  VIP_26_1: { column: 10, seatsArray: seatsArray_26_1 },
  VIP_29_1: { column: 11, seatsArray: seatsArray_29_1 },
  VIP_32_1: { column: 12, seatsArray: seatsArray_32_1 },
};
const unknownLayout = { column: 9, seatsArray: [] };

const BusDetails = ({ serviceID, busCode, showDetails, setShowDetails }: Props) => {
  // The seats as the API sent them, or null while they are not loaded.
  const [seats, setSeats] = useState<SeatArrayType[] | null>(null);
  const [errorFetching, setErrorFetching] = useState(false);
  // Goes up by one for each press of "try again", which makes the effect below run again.
  const [retryCount, setRetryCount] = useState(0);
  const { column, seatsArray } = busLayouts[busCode] ?? unknownLayout;

  useEffect(() => {
    if (!showDetails) {
      // This timer waits for a CSS animation: the seat map takes 0.3s to fold away
      // (max-height in busDetails.module.css). The map is swapped for the loading spinner
      // only after it is out of sight. (updated 2026-10-12)
      const timer = setTimeout(() => setSeats(null), 400);
      return () => clearTimeout(timer);
    }
    const abortController = new AbortController();
    fetchSeats(serviceID, abortController.signal)
      .then((data) => setSeats(data))
      .catch((error) => {
        if (error.name === "AbortError") return;
        console.error(error);
        setSeats(null);
        setErrorFetching(true);
      });
    return () => abortController.abort();
  }, [showDetails, serviceID, retryCount]);

  // The layout with each seat's status filled in from the API's answer.
  const convertedSeatsArray = useMemo(
    () =>
      seatsArray.map((seat): SeatType => {
        const matchedSeat = seat && seats?.find((re) => re.SeatNumber === seat[0]);
        if (!seat || !matchedSeat) return seat;
        return [seat[0], matchedSeat.Accessible ? matchedSeat.Gender : "N"];
      }),
    [seatsArray, seats]
  );

  const retry = () => {
    setErrorFetching(false);
    setRetryCount((count) => count + 1);
  };

  const busDetailsClasses = `${s.busDetails} ${showDetails ? s.show : ""}`;

  return (
    <div className={busDetailsClasses}>
      {seats ? (
        <BusDetailsDisplay convertedSeatsArray={convertedSeatsArray} column={column} setShowDetails={setShowDetails} />
      ) : !errorFetching ? (
        <BusLoading />
      ) : (
        <BusSchemaError retry={retry} />
      )}
    </div>
  );
};

export default BusDetails;
