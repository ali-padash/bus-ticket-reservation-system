import { useEffect, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import s from "../assets/css/booking.module.css";
import BookingFrame from "../components/BookingFrame";
import BookingSteps from "../components/BookingSteps";
import TripSummary from "../components/TripSummary";
import SeatPicker from "../components/SeatPicker";
import PassengerForm from "../components/PassengerForm";
import { Passenger, SeatMap, Trip } from "../util/Models";
import { ApiError, errorTextKey, fetchSeatMap, fetchTrip, reserveSeats } from "../util/FetchFunction";
import { FieldErrors, PassengerDraft, emptyPassenger, translateFieldErrors, validateBooking } from "../util/Validation";
import { parseBirthDate, toLatinDigits } from "../util/Locale";
import { useLocale } from "../util/useLocale";
import { savePhone } from "../util/TicketStorage";

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
// The address is /<language>/booking/<tripId>?seats=18,19&step=passengers.
// - The trip is loaded by its ID, so the address needs nothing else to show it. The way back
//   to the results is built from the trip's two city IDs and its date.
// - seats and step say where the buyer is, so refresh and the back button keep the place.
// What is typed into the form is ordinary state: it is personal, so it is not put in the
// address, and it is gone after a refresh. (updated 2026-10-12)
function BookingPage() {
  const { tripId } = useParams();
  const tripID = Number(tripId);
  const navigate = useNavigate();
  const { lang, t, path, name, text } = useLocale();
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedSeats = parseSeats(searchParams.get("seats"));
  const onPassengerStep = searchParams.get("step") === "passengers" && selectedSeats.length > 0;

  const [trip, setTrip] = useState<Trip | null>(null);
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
  // Where the sentence for a failed submit is in the text files. Keeping the key, not the
  // sentence, lets the message change language with the page.
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const abortController = new AbortController();
    setTripFailed(false);
    fetchTrip(tripID, abortController.signal)
      .then((data) => setTrip(data))
      .catch((err) => {
        if (err.name !== "AbortError") setTripFailed(true);
      });
    return () => abortController.abort();
  }, [tripID]);

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

  // Until the trip has arrived the page does not know which search it belongs to.
  const resultsLink = trip
    ? path(`/services?from=${trip.OriginCityID}&to=${trip.DestinationCityID}&date=${trip.DepartureDate}`)
    : path("/");

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
    const errors = validateBooking(lang, contactPhone, drafts);
    setFieldErrors(errors);
    setSubmitError(null);
    if (Object.keys(errors).length > 0) return;

    const phone = toLatinDigits(contactPhone.trim());
    const toSend: Passenger[] = drafts.map((draft, index) => ({
      SeatNumber: selectedSeats[index],
      FirstName: draft.FirstName.trim(),
      LastName: draft.LastName.trim(),
      NationalCode: toLatinDigits(draft.NationalCode.trim()),
      BirthDate: parseBirthDate(lang, draft.BirthDate) ?? "",
      Gender: draft.Gender === "F" ? "F" : "M",
    }));

    setSubmitting(true);
    reserveSeats(tripID, phone, toSend)
      .then((ticket) => {
        // The seats are now on hold. The phone is remembered for this tab only, so the
        // ticket page can open the ticket without the phone ever being in the address.
        savePhone(ticket.Code, phone);
        navigate(path(`/tickets/${ticket.Code}`));
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
        } else {
          // Every other code has its sentence in the text files; an unknown fault gets
          // the general one.
          setSubmitError(errorTextKey(err));
        }
      });
  };

  if (tripFailed) {
    return (
      <BookingFrame>
        <div className={`${s.card} ${s.centred} ${s.failed}`}>
          <i className={`fas fa-exclamation-circle ${s.bigIcon}`} />
          <h2>{t("errors.codes.trip_not_found")}</h2>
          <div className={s.centredActions}>
            <Link className={`${s.primary} ${s.buttonLink}`} to={path("/")}>
              {t("booking.searchAgain")}
            </Link>
          </div>
        </div>
      </BookingFrame>
    );
  }

  return (
    <BookingFrame>
      <div className={s.container}>
        {trip && (
          <TripSummary
            originName={name(trip.OriginPersianName, trip.OriginEnglishName)}
            destinationName={name(trip.DestinationPersianName, trip.DestinationEnglishName)}
            originTerminal={name(trip.OriginTerminalPersianName, trip.OriginTerminalName)}
            destinationTerminal={name(trip.DestinationTerminalPersianName, trip.DestinationTerminalName)}
            company={name(trip.CompanyPersianName, trip.CompanyName)}
            busType={text(trip.BusType, trip.BusTypeEnglish)}
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
