import { useEffect, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import s from "../assets/css/booking.module.css";
import BookingFrame from "../components/BookingFrame";
import BookingSteps from "../components/BookingSteps";
import TripSummary from "../components/TripSummary";
import SeatPicker from "../components/SeatPicker";
import PassengerForm from "../components/PassengerForm";
import { Passenger, SeatMap, ServiceResponse } from "../util/Models";
import { ApiError, fetchSeatMap, fetchServices, reserveSeats } from "../util/FetchFunction";
import {
  FieldErrors,
  PassengerDraft,
  emptyPassenger,
  persianDateToGregorian,
  toLatinDigits,
  translateFieldErrors,
  validateBooking,
} from "../util/Validation";
import { saveTicketSession } from "../util/TicketStorage";

const MAX_SEATS = 4;

// "18,19" from the address -> [18, 19]: whole numbers, each once, in seat order, 4 at most.
const parseSeats = (value: string | null): number[] => {
  const numbers = (value ?? "")
    .split(",")
    .map(Number)
    .filter((seat) => Number.isInteger(seat) && seat > 0);
  return [...new Set(numbers)].sort((a, b) => a - b).slice(0, MAX_SEATS);
};

// Steps 2 and 3 of buying: choosing seats, then typing the passengers.
//
// The address is /booking/<tripId>?from=&to=&date=&seats=18,19&step=passengers.
// - from/to/date are the search the buyer came from. The API has no "one trip" route, so
//   the page repeats that search and picks its trip out of the result. They are also the
//   way back to the results.
// - seats and step say where the buyer is, so refresh and the back button keep the place.
// What is typed into the form is ordinary state: it is personal, so it is not put in the
// address, and it is gone after a refresh. (written 2026-10-12)
function BookingPage() {
  const { tripId } = useParams();
  const tripID = Number(tripId);
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const from = Number(searchParams.get("from"));
  const to = Number(searchParams.get("to"));
  const date = searchParams.get("date") ?? "";
  const searchQuery = `from=${from}&to=${to}&date=${date}`;
  const resultsLink = `/services?${searchQuery}`;
  const selectedSeats = parseSeats(searchParams.get("seats"));
  const onPassengerStep = searchParams.get("step") === "passengers" && selectedSeats.length > 0;

  const [servicesData, setServicesData] = useState<ServiceResponse | null>(null);
  const [tripFailed, setTripFailed] = useState(false);
  const [seatMap, setSeatMap] = useState<SeatMap | null>(null);
  const [seatMapFailed, setSeatMapFailed] = useState(false);
  // Goes up by one each time the seat map should be loaded again.
  const [seatMapVersion, setSeatMapVersion] = useState(0);
  const [limitReached, setLimitReached] = useState(false);
  const [takenSeats, setTakenSeats] = useState<number[]>([]);

  const [contactPhone, setContactPhone] = useState("");
  const [passengers, setPassengers] = useState<{ [seatNumber: number]: PassengerDraft }>({});
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const abortController = new AbortController();
    setTripFailed(false);
    fetchServices(date, from, to, abortController.signal)
      .then((data) => setServicesData(data))
      .catch((err) => {
        if (err.name !== "AbortError") setTripFailed(true);
      });
    return () => abortController.abort();
  }, [date, from, to]);

  useEffect(() => {
    const abortController = new AbortController();
    setSeatMapFailed(false);
    fetchSeatMap(tripID, abortController.signal)
      .then((data) => setSeatMap(data))
      .catch((err) => {
        if (err.name !== "AbortError") setSeatMapFailed(true);
      });
    return () => abortController.abort();
  }, [tripID, seatMapVersion]);

  const trip = servicesData?.Items.find((item) => item.ID === tripID);

  // The seats and the step live in the address. A seat click replaces the current history
  // entry (so "back" does not replay every click); a step change adds one.
  const goTo = (seats: number[], step: "seats" | "passengers", replace: boolean) => {
    const newParams = new URLSearchParams(searchParams);
    if (seats.length) newParams.set("seats", seats.join(","));
    else newParams.delete("seats");
    if (step === "passengers") newParams.set("step", "passengers");
    else newParams.delete("step");
    setSearchParams(newParams, { replace });
  };

  const handleToggleSeat = (seatNumber: number) => {
    setTakenSeats([]);
    if (selectedSeats.includes(seatNumber)) {
      setLimitReached(false);
      goTo(selectedSeats.filter((seat) => seat !== seatNumber), "seats", true);
    } else if (selectedSeats.length >= MAX_SEATS) {
      setLimitReached(true);
    } else {
      goTo([...selectedSeats, seatNumber].sort((a, b) => a - b), "seats", true);
    }
  };

  const handleSubmit = () => {
    const drafts = selectedSeats.map((seatNumber) => passengers[seatNumber] ?? emptyPassenger);
    const errors = validateBooking(contactPhone, drafts);
    setFieldErrors(errors);
    setSubmitError(null);
    if (Object.keys(errors).length > 0) return;

    const phone = toLatinDigits(contactPhone.trim());
    const toSend: Passenger[] = drafts.map((draft, index) => ({
      SeatNumber: selectedSeats[index],
      FirstName: draft.FirstName.trim(),
      LastName: draft.LastName.trim(),
      NationalCode: toLatinDigits(draft.NationalCode.trim()),
      BirthDate: persianDateToGregorian(draft.BirthDate) ?? "",
      Gender: draft.Gender === "F" ? "F" : "M",
    }));

    setSubmitting(true);
    reserveSeats(tripID, phone, toSend)
      .then((ticket) => {
        // The seats are now on hold. The phone is remembered for this tab only, so the
        // ticket page can open the ticket without the phone ever being in the address.
        saveTicketSession(ticket.Code, { phone, search: searchQuery });
        navigate(`/tickets/${ticket.Code}`);
      })
      .catch((err) => {
        setSubmitting(false);
        if (err instanceof ApiError && err.code === "validation_failed") {
          setFieldErrors(translateFieldErrors(err.fields));
        } else if (err instanceof ApiError && err.code === "seats_unavailable") {
          // Someone else got there first. Nothing was reserved, so go back to the seats,
          // drop the lost ones from the choice and draw the map again.
          setTakenSeats(err.seats);
          setSeatMapVersion((version) => version + 1);
          goTo(selectedSeats.filter((seat) => !err.seats.includes(seat)), "seats", true);
        } else if (err instanceof ApiError && err.code === "trip_departed") {
          setSubmitError("این اتوبوس حرکت کرده است و دیگر قابل خرید نیست.");
        } else {
          setSubmitError("متاسفانه خطایی رخ داده است. لطفا دوباره تلاش کنید.");
        }
      });
  };

  if (tripFailed || (servicesData && !trip)) {
    return (
      <BookingFrame>
        <div className={`${s.card} ${s.centred} ${s.failed}`}>
          <i className={`fas fa-exclamation-circle ${s.bigIcon}`} />
          <h2>این سرویس پیدا نشد</h2>
          <div className={s.centredActions}>
            <Link className={`${s.primary} ${s.buttonLink}`} to="/">
              جستجوی مجدد سرویس
            </Link>
          </div>
        </div>
      </BookingFrame>
    );
  }

  return (
    <BookingFrame>
      <div className={s.container}>
        {servicesData && trip && (
          <TripSummary
            originName={servicesData.OriginPersianName}
            destinationName={servicesData.DestinationPersianName}
            originTerminal={trip.OriginTerminalPersianName}
            destinationTerminal={trip.DestinationTerminalPersianName}
            company={trip.CompanyPersianName}
            busType={trip.BusType}
            date={trip.DepartureDate}
            time={trip.DepartureTime}
            price={trip.Price}
            availableSeats={seatMap?.AvailableSeatCount ?? trip.AvailableSeatCount}
          />
        )}
        <div className={`${s.card} ${s.main}`}>
          <BookingSteps current={onPassengerStep ? 3 : 2} />
          {onPassengerStep ? (
            <PassengerForm
              seats={selectedSeats}
              contactPhone={contactPhone}
              setContactPhone={setContactPhone}
              passengers={passengers}
              setPassenger={(seatNumber, passenger) => setPassengers({ ...passengers, [seatNumber]: passenger })}
              fieldErrors={fieldErrors}
              submitError={submitError}
              submitting={submitting}
              onSubmit={handleSubmit}
              onBack={() => goTo(selectedSeats, "seats", false)}
            />
          ) : (
            <SeatPicker
              seatMap={seatMap}
              seatMapFailed={seatMapFailed}
              retry={() => setSeatMapVersion((version) => version + 1)}
              selectedSeats={selectedSeats}
              onToggleSeat={handleToggleSeat}
              takenSeats={takenSeats}
              limitReached={limitReached}
              onContinue={() => goTo(selectedSeats, "passengers", false)}
              resultsLink={resultsLink}
            />
          )}
        </div>
      </div>
    </BookingFrame>
  );
}

export default BookingPage;
