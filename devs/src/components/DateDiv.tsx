import "../assets/css/dateDiv.css";
interface Props {
  className: string;
  selectedDate: Date;
  onOpen: () => void;
}

const DateDiv = ({ className, selectedDate, onOpen }: Props) => {
  return (
    <div className={className} onClick={onOpen}>
      {/* Invisible, but it can take the focus, so the Tab key reaches the date and opens the calendar. */}
      <input type="text" onFocus={onOpen} style={{ position: "absolute", opacity: 0, pointerEvents: "none" }} />
      <div className="date">
        <span>{selectedDate.toLocaleString("fa-IR", { weekday: "long" })}</span>{" "}
        <span>{selectedDate.toLocaleString("fa-IR", { day: "numeric" })}</span>{" "}
        <span>{selectedDate.toLocaleString("fa-IR", { month: "long" })}</span>{" "}
        <span>{selectedDate.toLocaleString("fa-IR", { year: "numeric" })}</span>
      </div>
      <i className="icon-date"></i>
    </div>
  );
};

export default DateDiv;
