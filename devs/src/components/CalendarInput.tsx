import React from "react";
import "../assets/css/calendarInput.css";
import Calendar from "./Calendar";
import LongDate from "./LongDate";
import { useLocale } from "../util/useLocale";
import Icon from "./Icon";

interface Props {
  display: boolean;
  setDisplay: (display: boolean) => void;
  selectedDate: Date;
  onSelectDate: (date: Date) => void;
}

const CalendarInput = ({ display, setDisplay, selectedDate, onSelectDate }: Props) => {
  const { t } = useLocale();
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
        <Icon name="calendar" style={{ color: "#555" }} />
        <LongDate date={selectedDate} />
      </div>
      <div
        className={`expandable-card2-content${display ? " show" : ""} calendar`}
        style={{ width: "400px", paddingInline: "0", paddingBottom: "0"}}>
        <Calendar className="calendar-2" selectedDate={selectedDate} onSelectDate={onSelectDate} />
        <div className="bottom-calendar">
          <div className="crosss unselectable" role="button" aria-label={t("home.closeCalendar")} onClick={() => setDisplay(false)}>
            ×
          </div>
          <div className="today-info" onClick={() => onSelectDate(today)}>
            <Icon name="share" className="mirror-in-ltr" />
            <span>{t("calendar.today")}</span>{" "}
            <LongDate date={today} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default CalendarInput;
