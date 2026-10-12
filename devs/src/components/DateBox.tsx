import { useEffect, useRef } from "react";
import "../assets/css/dateBox.css";
import Calendar from "./Calendar";
import { useLocale } from "../util/useLocale";

interface Props {
  display: boolean;
  setDisplay: (display: boolean) => void;
  selectedDate: Date;
  onSelectDate: (date: Date) => void;
}

const DateBox = ({ display, setDisplay, selectedDate, onSelectDate }: Props) => {
  const { t } = useLocale();
  const dateBoxRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dateBoxRef.current && !dateBoxRef.current.contains(event.target as Node)) {
        setDisplay(false); // If click was outside DateBox, close it
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [setDisplay]);

  return (
    <div
      className="date-box"
      ref={dateBoxRef}
      style={{
        pointerEvents: display ? "auto" : "none",
        opacity: display ? 1 : 0,
        transition: display ? "opacity 0.3s" : "opacity 0.2s",
      }}>
      <i className="cross" role="button" aria-label={t("home.closeCalendar")} onClick={() => setDisplay(false)} />
      <i className="fas fa-calendar-alt" id="calender" aria-hidden="true">
        <div className="tooltip-message-triangle">▲</div>
        <div className="tooltip-message">{t("home.dateTooltip")}</div>
      </i>
      <h3 style={{ color: "black" }}>{t("home.chooseDate")}</h3>
      <Calendar className="calendar" selectedDate={selectedDate} onSelectDate={onSelectDate} />
    </div>
  );
};

export default DateBox;
