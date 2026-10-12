import { useEffect, useState } from "react";
import CustomAutocomplete from "./CustomAutocomplete";
import s from "../assets/css/homeHeader.module.css";
import { City } from "../util/Models";

interface Props {
  covered: boolean;
  calendarOpen: boolean;
  cities: City[];
  className: string;
  placeholder: string;
  value: City | null;
  onChange: (city: City | null) => void;
  onPick: () => void;
  onFocus: () => void;
  onBlur: () => void;
  inputRef: React.RefObject<HTMLInputElement>;
  offset?: string;
  alertMassage?: string;
  alertBoolean?: boolean;
  delay?: string;
}

const CustomInput = ({
  covered,
  calendarOpen,
  cities,
  className,
  placeholder,
  value,
  onChange,
  onPick,
  onFocus,
  onBlur,
  inputRef,
  offset = "21%",
  alertMassage = "",
  alertBoolean = false,
  delay = "",
}: Props) => {
  // True while the calendar is open and for a moment after it closes.
  const [calendarFading, setCalendarFading] = useState(false);
  useEffect(() => {
    if (calendarOpen) {
      setCalendarFading(true);
      return;
    }
    // This timer waits for a CSS animation: the calendar popup and the dark cover take 0.2s
    // to fade out (`.date-box` and `.black-cover`). The box stays on the lower layer until
    // they are gone, so it does not jump in front of them. (updated 2026-10-12)
    const timer = setTimeout(() => setCalendarFading(false), 250);
    return () => clearTimeout(timer);
  }, [calendarOpen]);

  return (
    <div
      className={className}
      style={{ zIndex: covered || calendarFading ? 1000 : 1002 }}
      onMouseDown={(e) => {
        // A press anywhere on the box (the icon, the padding) puts the cursor in the text box.
        // preventDefault stops the browser from taking the focus away again.
        if (e.target !== inputRef.current) {
          e.preventDefault();
          inputRef.current?.focus();
        }
      }}>
      <div className={"element-cover" + (covered ? " show" : "")} />
      <div className="triangle-right"></div>
      <CustomAutocomplete
        cities={cities}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        onPick={onPick}
        onFocus={onFocus}
        onBlur={onBlur}
        inputRef={inputRef}
        offset={offset}
      />
      <div className={s["alert-container"]}>
        <p className={alertBoolean ? s.show : ""} style={{ transitionDelay: alertBoolean ? delay : "0s" }}>
          {alertMassage}
        </p>
      </div>
      <i className="icon-location"></i>
    </div>
  );
};

export default CustomInput;
