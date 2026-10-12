import { useCallback, useEffect, useRef, useState } from "react";
import "../assets/css/searchPanel.css";
import CustomAutocomplete from "./CustomAutocomplete";
import CalenderInput from "./CalendarInput";
import { CitiesStatus, City } from "../util/Models";
import { useLocale } from "../util/useLocale";

interface Props {
  cities: City[];
  citiesStatus: CitiesStatus;
  initialOrigin: City | null;
  initialDestination: City | null;
  selectedDate: Date;
  onSearch: (origin: City, destination: City) => void;
  onSelectDate: (date: Date) => void;
}

// The search bar on the results page. The two cities here are a draft: they start as the
// cities of the search on screen and only become the search when the visitor presses the
// button (or swaps them). The date is not a draft; picking a day searches at once.
// (updated 2026-10-12)
const SearchPanel = ({
  cities,
  citiesStatus,
  initialOrigin,
  initialDestination,
  selectedDate,
  onSearch,
  onSelectDate,
}: Props) => {
  const { t } = useLocale();
  const [origin, setOrigin] = useState(initialOrigin);
  const [destination, setDestination] = useState(initialDestination);
  const [display, setDisplay] = useState(false);
  // While the city list is still on its way the boxes are empty for that reason alone, so
  // the "please enter" message waits for the list.
  const [showMissing, setShowMissing] = useState(citiesStatus === "ready" && (!initialOrigin || !initialDestination));
  const originRef = useRef<HTMLInputElement>(null);
  const destinationRef = useRef<HTMLInputElement>(null);

  const search = useCallback(
    (from: City | null, to: City | null) => {
      if (!from || !to) {
        setShowMissing(true);
        return;
      }
      setShowMissing(false);
      setDisplay(false);
      onSearch(from, to);
    },
    [onSearch]
  );

  // Enter walks through the form: origin -> destination -> calendar -> search.
  // Escape closes everything. The keys are caught on the window because they must also work
  // when nothing on the page has the focus. (updated 2026-10-12)
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setDisplay(false);
        originRef.current?.blur();
        destinationRef.current?.blur();
        return;
      }
      const tagName = event.target instanceof HTMLElement ? event.target.tagName : "";
      if (event.key !== "Enter" || ["BUTTON", "INPUT", "A"].includes(tagName)) return;
      event.preventDefault();
      if (!origin) originRef.current?.focus();
      else if (!destination) destinationRef.current?.focus();
      else if (!display) setDisplay(true);
      else search(origin, destination);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [origin, destination, display, search]);

  const handleExchange = () => {
    setOrigin(destination);
    setDestination(origin);
    search(destination, origin);
  };

  const alertMessage = () => {
    const isSourceMissing = showMissing && !origin;
    const isDestinationMissing = showMissing && !destination;
    if (isSourceMissing && isDestinationMissing) return t("search.missingBoth");
    else if (isSourceMissing) return t("search.missingOrigin");
    else if (isDestinationMissing) return t("search.missingDestination");
    return "";
  };

  return (
    <div className="search-panel">
      <div className="container">
        <div className="row">
          <div className="text">{t("search.origin")}</div>
          <div className="text">{t("search.destination")}</div>
          <div className="text">{t("search.departureDate")}</div>
          <div className="text special">{alertMessage()}</div>
        </div>
        <div className="row" style={{ color: "#333" }}>
          <div className="in to">
            <i className="fas fa-map-marker-alt" style={{ color: "#555" }}></i>
            <CustomAutocomplete
              placeholder={t("home.originPlaceholder")}
              cities={cities}
              citiesStatus={citiesStatus}
              value={origin}
              onChange={setOrigin}
              onPick={() => destinationRef.current?.focus()}
              inputRef={originRef}
              style={{ color: "#333" }}
            />
          </div>
          <i className="fas fa-exchange-alt custom-gap" role="button" aria-label={t("search.swap")} onClick={handleExchange}></i>
          <div className="in from">
            <i className="fas fa-map-marker-alt" style={{ color: "#555" }}></i>
            <CustomAutocomplete
              placeholder={t("home.destinationPlaceholder")}
              cities={cities}
              citiesStatus={citiesStatus}
              value={destination}
              onChange={setDestination}
              onPick={() => {
                destinationRef.current?.blur();
                setDisplay(true);
              }}
              inputRef={destinationRef}
              style={{ color: "#333" }}
            />
          </div>
          <div className="custom-gap" />
          <CalenderInput
            display={display}
            setDisplay={setDisplay}
            selectedDate={selectedDate}
            onSelectDate={onSelectDate}
          />
          <div className="custom-gap" />
          <button className="search" id="search-button" onClick={() => search(origin, destination)}>
            {t("search.submit")}
            <i className="fas fa-search" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default SearchPanel;
