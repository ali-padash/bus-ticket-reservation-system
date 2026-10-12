import { useState } from "react";
import "../assets/css/calendar.css";
import { monthView, shiftMonth } from "../util/Locale";
import { useLocale } from "../util/useLocale";

interface Props {
  className: string;
  selectedDate: Date;
  onSelectDate: (date: Date) => void;
}

const sameDay = (a: Date, b: Date) => a.toDateString() === b.toDateString();

// A month grid in the calendar of the page's language: a Persian (Jalali) month whose week
// starts on Saturday, or a Gregorian month whose week starts on Monday. The dates going in and
// out are ordinary Date values either way, so nothing outside knows which calendar is shown.
// (rewritten 2026-10-12)
const Calendar = ({ className, selectedDate, onSelectDate }: Props) => {
  const { lang, t, num, icons } = useLocale();
  // The month on screen. It starts at the chosen date's month and moves with the arrows.
  const [searchDate, setSearchDate] = useState(() => new Date(selectedDate));
  const today = new Date();
  const view = monthView(lang, searchDate);
  const weekdays = t("calendar.weekdays", { returnObjects: true }) as string[];
  const year = <span> {view.year}</span>;
  const month = <span className="month"> {view.month} </span>;
  return (
    <div className={className}>
      <div>
        <i
          className={`fas ${icons.back}`}
          role="button"
          aria-label={t("calendar.previousMonth")}
          onClick={() => setSearchDate(shiftMonth(lang, searchDate, -1))}
        />
        {/* Persian writes the year first, English the month first. */}
        <div className="year-and-month unselectable">
          {lang === "fa" ? year : month}
          {lang === "fa" ? month : year}
        </div>
        <i
          className={`fas ${icons.forward}`}
          role="button"
          aria-label={t("calendar.nextMonth")}
          onClick={() => setSearchDate(shiftMonth(lang, searchDate, 1))}
        />
      </div>
      <div className="seperator-line-calendar"></div>
      <div className="grid weekdays">
        {weekdays.map((weekday) => (
          <div key={weekday}>{weekday}</div>
        ))}
      </div>
      <div className="grid days">
        {
          Array.from({ length: view.leadingBlanks }, (_, index) => (
            <div key={`empty-${index}`} className=""></div>
          )) /*empty places*/
        }
        {view.days.map((date, index) => (
          <div
            key={index}
            className={[
              "day",
              sameDay(date, selectedDate) ? "selected" : "",
              "unselectable",
              sameDay(date, today) ? "today" : "",
              // Friday is the weekly day off in Iran, whichever column it falls in.
              date.getDay() === 5 ? "holiday" : "",
            ]
              .filter(Boolean)
              .join(" ")}
            onClick={() => onSelectDate(date)}>
            {num(index + 1)}
          </div>
        ))}
      </div>
    </div>
  );
};

export default Calendar;
