import "../assets/css/dateDiv.css";
import LongDate from "./LongDate";

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
        <LongDate date={selectedDate} />
      </div>
      <i className="icon-date"></i>
    </div>
  );
};

export default DateDiv;
