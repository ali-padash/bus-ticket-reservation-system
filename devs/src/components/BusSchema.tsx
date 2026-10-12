import s from "../assets/css/busSchema.module.css";
import Seat from "./Seat";
import busFront from "../assets/images/BusFront.png";
import { SeatArrayType, SeatStatus } from "../util/Models";

interface Props {
  // The floor plan from the API, row by row: a number is a seat, null is empty floor.
  layout: (number | null)[][];
  seats: SeatArrayType[];
  className?: string;
  blur?: boolean;
  // Given only where seats can be chosen (the booking page).
  selectedSeats?: number[];
  onToggleSeat?: (seatNumber: number) => void;
}

// Draws any bus the API describes. Nothing here knows a bus model: the number of rows and
// columns comes from `layout`, so a new kind of bus needs no change in the website.
// (rewritten 2026-10-12)
const BusSchema = ({ layout, seats, className = "", blur = false, selectedSeats = [], onToggleSeat }: Props) => {
  const columns = layout[0]?.length ?? 0;

  const statusOf = (seatNumber: number): SeatStatus => {
    if (selectedSeats.includes(seatNumber)) return "S";
    const seat = seats.find((seat) => seat.SeatNumber === seatNumber);
    if (!seat) return null;
    return seat.Accessible ? seat.Gender : "N";
  };

  return (
    <div className={s.busSchema + " " + className + " unselectable"} style={{filter: blur ? "blur(2px)" : ""}}>
      <div className={s.busInner}>
        <div
          className={s.grid}
          style={{ gridTemplateColumns: `repeat(${columns}, 1fr)`, gridTemplateRows: `repeat(${layout.length}, 1fr)` }}>
          {layout.flat().map((seatNumber, index) => {
            // A cell's place on the floor never changes, so its position is a safe key.
            if (seatNumber === null) return <div key={index} />;
            const status = statusOf(seatNumber);
            // Only a free seat, or one already chosen here, can be clicked.
            const canToggle = onToggleSeat && (status === null || status === "S");
            return (
              <Seat
                key={index}
                seatNumber={seatNumber}
                status={status}
                onClick={canToggle ? () => onToggleSeat(seatNumber) : undefined}
              />
            );
          })}
        </div>
      </div>
      <img src={busFront} alt="bus front" />
    </div>
  );
};

export default BusSchema;
