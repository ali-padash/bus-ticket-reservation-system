import { useCallback, useEffect, useRef, useState } from "react";
import CustomInput from "./CustomInput";
import DateDiv from "./DateDiv";
import DateBox from "./DateBox";
import styles from "../assets/css/homeHeader.module.css";
import { useNavigate } from "react-router-dom";
import { CitiesStatus, City } from "../util/Models";
import { formatDate } from "../util/Function";
import { useLocale } from "../util/useLocale";

export type FocusedField = "origin" | "destination" | null;

// Which city box has the focus, and whether the calendar is open, live in the page, because
// the navbar dims itself with the same two facts. Everything else about the form lives here.
interface Props {
  cities: City[];
  citiesStatus: CitiesStatus;
  focusedField: FocusedField;
  setFocusedField: (field: FocusedField) => void;
  calendarOpen: boolean;
  setCalendarOpen: (open: boolean) => void;
}

const HomeHeader = ({ cities, citiesStatus, focusedField, setFocusedField, calendarOpen, setCalendarOpen }: Props) => {
  const navigate = useNavigate();
  const { t, path } = useLocale();
  const [origin, setOrigin] = useState<City | null>(null);
  const [destination, setDestination] = useState<City | null>(null);
  const [selectedDate, setSelectedDate] = useState(new Date());
  // The "please choose" messages show once a city box has been left, or a search was tried.
  const [showMissing, setShowMissing] = useState(false);
  const originRef = useRef<HTMLInputElement>(null);
  const destinationRef = useRef<HTMLInputElement>(null);

  // The search itself travels in the address, so the results page can be refreshed or shared.
  const submit = useCallback(() => {
    if (!origin || !destination) {
      setShowMissing(true);
      return;
    }
    navigate(path(`/services?from=${origin.ID}&to=${destination.ID}&date=${formatDate(selectedDate)}`));
  }, [origin, destination, selectedDate, navigate, path]);

  // Enter walks through the form: origin -> destination -> calendar -> search.
  // Escape closes everything. The keys are caught on the window because they must also work
  // when nothing on the page has the focus. (updated 2026-10-12)
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        if (event.target instanceof HTMLElement) event.target.blur();
        setFocusedField(null);
        setCalendarOpen(false);
        return;
      }
      const tagName = event.target instanceof HTMLElement ? event.target.tagName : "";
      if (event.key !== "Enter" || ["A", "I"].includes(tagName)) return;
      event.preventDefault();
      // While a city box has the focus, Enter belongs to its suggestion list.
      if (focusedField !== null) return;
      if (calendarOpen) {
        if (origin && destination) submit();
      } else if (!origin) originRef.current?.focus();
      else if (!destination) destinationRef.current?.focus();
      else setCalendarOpen(true);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [focusedField, calendarOpen, origin, destination, submit, setFocusedField, setCalendarOpen]);

  const handleFocus = (field: FocusedField) => {
    setFocusedField(field);
    setShowMissing(false);
  };
  const handleBlur = () => {
    setFocusedField(null);
    setShowMissing(true);
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
      method="POST"
      name="myForm">
      <div className={styles["home-header"]}>
        <div className={styles.container}>
          <div className={`black-cover${focusedField !== null || calendarOpen ? " show" : ""}`}></div>
          <h2>{t("home.title")}</h2>
          <h5>{t("home.subtitle")}</h5>
          <CustomInput
            className={`${styles.in} from`}
            covered={focusedField === "destination" || calendarOpen}
            calendarOpen={calendarOpen}
            cities={cities}
            citiesStatus={citiesStatus}
            value={origin}
            onChange={setOrigin}
            onPick={() => destinationRef.current?.focus()}
            onFocus={() => handleFocus("origin")}
            onBlur={handleBlur}
            inputRef={originRef}
            placeholder={t("home.originPlaceholder")}
            alertMassage={t("home.originMissing")}
            alertBoolean={showMissing && !origin}
          />
          <CustomInput
            className={`${styles.in} to`}
            covered={focusedField === "origin" || calendarOpen}
            calendarOpen={calendarOpen}
            cities={cities}
            citiesStatus={citiesStatus}
            value={destination}
            onChange={setDestination}
            onPick={() => {
              destinationRef.current?.blur();
              setCalendarOpen(true);
            }}
            onFocus={() => handleFocus("destination")}
            onBlur={handleBlur}
            inputRef={destinationRef}
            placeholder={t("home.destinationPlaceholder")}
            alertMassage={t("home.destinationMissing")}
            alertBoolean={showMissing && !destination}
            delay="0.1s"
          />
          <DateDiv className={"date-div"} selectedDate={selectedDate} onOpen={() => setCalendarOpen(true)} />
          <DateBox
            display={calendarOpen}
            setDisplay={setCalendarOpen}
            selectedDate={selectedDate}
            onSelectDate={setSelectedDate}
          />
          <button type="submit" id="search-button" className={styles.search}>
            <div className={`element-cover${focusedField !== null ? ` ${" show"}` : ""}`} />
            {t("home.search")}
          </button>
        </div>
      </div>
    </form>
  );
};

export default HomeHeader;
