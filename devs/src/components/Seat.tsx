import { SeatStatus } from "../util/Models";
import { useLocale } from "../util/useLocale";

interface Props {
  seatNumber: number | null;
  status: SeatStatus;
  size?: string;
  // Given only for a seat the visitor may choose or un-choose. It makes the seat clickable.
  onClick?: () => void;
}

const backgroundColors = { M: "#aee2fa", F: "#ffb2d3", N: "#C5C5C5", S: "#27ae60", free: "white" };
const textColors = { M: "white", F: "white", N: "#777", S: "white", free: "#22819c" };

const Seat = ({ seatNumber, status, size = "27px", onClick }: Props) => {
  const { t, num } = useLocale();
  const look = status ?? "free";
  return (
    <div
      className="seat"
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      aria-label={onClick ? t("seatMap.seatLabel", { number: num(seatNumber ?? "") }) : undefined}
      onClick={onClick}
      onKeyDown={(e) => {
        if (onClick && (e.key === "Enter" || e.key === " ")) {
          e.preventDefault();
          // Enter here chooses the seat; it must not also reach a page-wide Enter handler.
          e.stopPropagation();
          onClick();
        }
      }}
      style={{
        backgroundColor: backgroundColors[look],
        color: textColors[look],
        margin: "var(--seat-margin, 4px auto)",
        borderRadius: "5px",
        fontWeight: "bold",
        // A seat is always a square. The seat map may ask for another size through the
        // `--seat` variable (it draws bigger seats on a phone, see busSchema.module.css);
        // without it the size given here is used. The number is centred with flex, so it
        // stays in the middle at any size. (updated 2026-10-13)
        width: `var(--seat, ${size})`,
        height: `var(--seat, ${size})`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        // In the legend the seat sits in a row beside its label and has no number inside, so
        // without this the row squeezes it down to a line. (added 2026-10-13)
        flexShrink: 0,
        fontSize: "var(--seat-text, 11px)",
        boxSizing: "border-box",
        border: status == null ? "1px solid silver" : "none",
        cursor: onClick ? "pointer" : undefined,
      }}>
      {seatNumber && num(seatNumber)}
    </div>
  );
};

export default Seat;
