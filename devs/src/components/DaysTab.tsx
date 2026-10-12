import { useEffect, useState } from "react";
import "../assets/css/daysTab.css";
import { addDays, formatDate } from "../util/Function";
import { dayAndMonth, weekdayName } from "../util/Locale";
import { useLocale } from "../util/useLocale";

interface Props {
  selectedDate: Date;
  onSelectDate: (date: Date) => void;
}

const DaysTab = ({ selectedDate, onSelectDate }: Props) => {
  const { lang, t, num, icons } = useLocale();
  const currentDate = new Date();
  const [numberOfTabs, setNumberOfTabs] = useState(7);

  const handleChange = (variable: number | Date) => {
    if (typeof variable === "number") onSelectDate(addDays(selectedDate, variable));
    else onSelectDate(variable);
  };
  currentDate.setHours(0, 0, 0, 0);
  let startDate;
  if (selectedDate > currentDate) {
    startDate = addDays(selectedDate, -1);
  } else {
    startDate = currentDate;
  }

  const getTabCountBasedOnWidth = () => {
    const width = window.innerWidth;
    if (width < 768) return 3;
    if (width < 1024) return 5;
    return 7;
  };

  useEffect(() => {
    const handleResize = () => setNumberOfTabs(getTabCountBasedOnWidth());
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const daysToShow = Array.from({ length: numberOfTabs }, (_, i) => addDays(startDate, i));
  return (
    <div className="days-tab unselectable">
      <div className="days-tab-container">
        <i
          className={`fas ${icons.back} previous`}
          role="button"
          aria-label={t("results.previousDay")}
          onClick={() => {
            handleChange(-1);
          }}></i>
        {daysToShow.map((date) => (
          <div
            key={formatDate(date)}
            className={`specific-day${selectedDate.toDateString() === date.toDateString() ? " selected" : ""}`}
            onClick={() => {
              handleChange(date);
            }}>
            <span className="weekday">{weekdayName(lang, date)}</span>
            <span className="date-after-weekday" style={{ margin: "5px" }}>
              {num(dayAndMonth(lang, date))}
            </span>
          </div>
        ))}
        <i
          className={`fas ${icons.forward}`}
          role="button"
          aria-label={t("results.nextDay")}
          onClick={() => {
            handleChange(1);
          }}></i>
      </div>
    </div>
  );
};

export default DaysTab;
