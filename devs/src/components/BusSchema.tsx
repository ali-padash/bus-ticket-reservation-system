import { CSSProperties } from "react";
import s from "../assets/css/busSchema.module.css";
import Seat from "./Seat";
import busFront from "../assets/images/busFront.svg";
import busFrontTop from "../assets/images/busFrontTop.svg";
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

  // The widths of the lines across the bus, for the phone drawing: a line with no seat at all
  // is the aisle and is drawn narrow. They are listed from the last line to the first because
  // the phone drawing is the same bus turned a quarter, nose up. (added 2026-10-13)
  const across = layout
    .map((row) => (row.every((seatNumber) => seatNumber === null) ? "var(--aisle)" : "var(--seat)"))
    .reverse()
    .join(" ");

  return (
    <div className={s.busSchema + " " + className + " unselectable"} style={{filter: blur ? "blur(2px)" : ""}}>
      <div className={s.busInner}>
        {/* Each seat is told its place on the floor (`--r` across the bus, `--c` along it) and
            the stylesheet decides where that is on screen: along the page on a wide screen,
            down the page on a phone. Empty floor needs no element. (updated 2026-10-13) */}
        <div className={s.grid} style={{ "--rows": layout.length, "--cols": columns, "--across": across } as CSSProperties}>
          {layout.map((row, rowIndex) =>
            row.map((seatNumber, columnIndex) => {
              if (seatNumber === null) return null;
              const status = statusOf(seatNumber);
              // Only a free seat, or one already chosen here, can be clicked.
              const canToggle = onToggleSeat && (status === null || status === "S");
              return (
                <div
                  key={seatNumber}
                  className={s.cell}
                  style={{ "--r": rowIndex + 1, "--c": columnIndex + 1 } as CSSProperties}>
                  <Seat
                    seatNumber={seatNumber}
                    status={status}
                    onClick={canToggle ? () => onToggleSeat(seatNumber) : undefined}
                  />
                </div>
              );
            })
          )}
        </div>
      </div>
      {/* Decoration: the seats themselves are what a screen reader should read. On a phone
          the bus is drawn nose up, so the same drawing is used turned a quarter. The width
          here is the one in busSchema.module.css. (updated 2026-10-13) */}
      <picture>
        <source media="(max-width: 600px)" srcSet={busFrontTop} />
        <img src={busFront} alt="" />
      </picture>
    </div>
  );
};

export default BusSchema;
