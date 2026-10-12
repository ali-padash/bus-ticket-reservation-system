import { useState } from "react";
import "../assets/css/calendar.css";
import { getFirstWeekday, toPersianNum } from "../util/Function";
import jalaali from "jalaali-js";

interface Props {
  className: string;
  selectedDate: Date;
  onSelectDate: (date: Date) => void;
}

const Calendar = ({ className, selectedDate, onSelectDate }: Props) => {
  // The month on screen. It starts at the chosen date's month and moves with the arrows.
  const [searchDate, setSearchDate] = useState(() => new Date(selectedDate));
  const today = new Date();
  const changeMonth = (step: number) => {
    const newSearchDate = new Date(searchDate);
    newSearchDate.setMonth(newSearchDate.getMonth() + step);
    setSearchDate(newSearchDate);
  };
  const clickHandler = (day: number) => {
    const jalaaliDate = jalaali.toJalaali(searchDate);
    const newGregorianDate = jalaali.toGregorian(jalaaliDate.jy, jalaaliDate.jm, day);
    onSelectDate(new Date(newGregorianDate.gy, newGregorianDate.gm - 1, newGregorianDate.gd));
  };
  return (
    <div className={className} style={{ direction: "rtl" }}>
      <div>
        <i className="fas fa-chevron-right" onClick={() => changeMonth(-1)} />
        <div className="year-and-month unselectable">
          <span> {searchDate.toLocaleString("fa-IR", { year: "numeric" })}</span>
          <span style={{ width: "40px", textAlign: "center" }}>
            {" "}
            {searchDate.toLocaleString("fa-IR", { month: "long" })}{" "}
          </span>
        </div>
        <i className="fas fa-chevron-left" onClick={() => changeMonth(1)} />
      </div>
      <div className="seperator-line-calendar"></div>
      <div className="grid weekdays">
        <div>ش</div>
        <div>ی</div>
        <div>د</div>
        <div>س</div>
        <div>چ</div>
        <div>پ</div>
        <div>ج</div>
      </div>
      <div className="grid days">
        {
          Array.from({ length: getFirstWeekday(searchDate) }, (_, index) => (
            <div key={`empty-${index}`} className=""></div>
          )) /*empty places*/
        }
        {Array.from(
          {
            length:
              jalaali.toJalaali(searchDate).jm <= 6
                ? 31
                : jalaali.toJalaali(searchDate).jm < 12
                ? 30
                : jalaali.isLeapJalaaliYear(jalaali.toJalaali(searchDate).jy)
                ? 30
                : 29,
          },
          (_, index) => index + 1
        ).map((day) => (
          <div
            key={day}
            className={`day
          ${
            jalaali.toJalaali(selectedDate).jd === day &&
            jalaali.toJalaali(selectedDate).jm === jalaali.toJalaali(searchDate).jm &&
            jalaali.toJalaali(selectedDate).jy === jalaali.toJalaali(searchDate).jy
              ? " selected"
              : ""
          }
           unselectable${
             jalaali.toJalaali(today).jd === day &&
             jalaali.toJalaali(today).jm === jalaali.toJalaali(searchDate).jm &&
             jalaali.toJalaali(today).jy === jalaali.toJalaali(searchDate).jy
               ? " today"
               : ""
           }`}
            onClick={() => clickHandler(day)}>
            {toPersianNum(day)}
          </div>
        ))}
      </div>
    </div>
  );
};

export default Calendar;
