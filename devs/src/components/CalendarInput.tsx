import React from "react";
import "../assets/css/calendarInput.css";
import Calendar from "./Calendar";

interface Props {
  display: boolean;
  setDisplay: (display: boolean) => void;
  selectedDate: Date;
  onSelectDate: (date: Date) => void;
}

const CalendarInput = ({ display, setDisplay, selectedDate, onSelectDate }: Props) => {
  const calendarDivRef = React.useRef<HTMLDivElement>(null);
  const today = new Date();

  // A click anywhere outside the date field and its dropdown closes the dropdown. The ref
  // covers both, so a click on the field itself is left to the toggle below. (updated 2026-10-12)
  React.useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (calendarDivRef.current && !calendarDivRef.current.contains(e.target as Node)) {
        setDisplay(false);
      }
    };
    document.addEventListener("click", handleClick);
    return () => {
      document.removeEventListener("click", handleClick);
    };
  }, [setDisplay]);

  return (
    <div className="calendar-div" ref={calendarDivRef}>
      <div className="calendar-input" onClick={() => setDisplay(!display)}>
        <i className="fas fa-calendar" style={{ color: "#555" }} />
        <span>{selectedDate.toLocaleString("fa-IR", { weekday: "long" })}</span>{" "}
        <span>{selectedDate.toLocaleString("fa-IR", { day: "numeric" })}</span>{" "}
        <span>{selectedDate.toLocaleString("fa-IR", { month: "long" })}</span>{" "}
        <span>{selectedDate.toLocaleString("fa-IR", { year: "numeric" })}</span>
      </div>
      <div
        className={`expandable-card2-content${display ? " show" : ""} calendar`}
        style={{ width: "400px", paddingInline: "0", paddingBottom: "0"}}>
        <Calendar className="calendar-2" selectedDate={selectedDate} onSelectDate={onSelectDate} />
        <div className="bottom-calendar">
          <div className="crosss unselectable" onClick={() => setDisplay(false)}>
            ×
          </div>
          <div className="today-info" onClick={() => onSelectDate(today)}>
            <i className="fas fa-share"/>
            <span>امروز،</span>{" "}
            <span>{today.toLocaleString("fa-IR", { weekday: "long" })}</span>{" "}
            <span>{today.toLocaleString("fa-IR", { day: "numeric" })}</span>{" "}
            <span>{today.toLocaleString("fa-IR", { month: "long" })}</span>{" "}
            <span>{today.toLocaleString("fa-IR", { year: "numeric" })}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CalendarInput;
