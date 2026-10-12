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
        margin: "4px auto",
        borderRadius: "5px",
        fontWeight: "bold",
        lineHeight: "29px",
        width: size,
        height: size,
        fontSize: "11px",
        textAlign: "center",
        boxSizing: "border-box",
        border: status == null ? "1px solid silver" : "none",
        cursor: onClick ? "pointer" : undefined,
      }}>
      {seatNumber && num(seatNumber)}
    </div>
  );
};

export default Seat;
