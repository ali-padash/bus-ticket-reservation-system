import { useState, ChangeEvent, KeyboardEvent, useEffect, useRef } from "react";
import "../assets/css/autocomplete.css";
import { CitiesStatus, City } from "../util/Models";
import { useLocale } from "../util/useLocale";

interface Props {
  cities: City[];
  citiesStatus: CitiesStatus;
  placeholder: string;
  value: City | null;
  onChange: (city: City | null) => void;
  onPick?: () => void;
  onFocus?: () => void;
  onBlur?: () => void;
  inputRef?: React.RefObject<HTMLInputElement>;
  offset?: string;
  style?: React.CSSProperties;
}

// A controlled city box. The parent owns the chosen city (`value`) and hears about every
// change through `onChange`: a city when the text names exactly one, null otherwise.
// `onPick` is called when the visitor chooses from the list with Enter or the mouse, so the
// parent can move the focus on. (updated 2026-10-12)
const CustomAutocomplete = ({
  cities,
  citiesStatus,
  placeholder,
  value,
  onChange,
  onPick = () => {},
  onFocus = () => {},
  onBlur = () => {},
  inputRef = undefined,
  offset = "11%",
  style = undefined,
}: Props) => {
  const { t, cityName, provinceName } = useLocale();
  // The text being typed. It is null whenever the box simply shows the chosen city's name.
  const [draft, setDraft] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<City[]>([]);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [alertNoMatch, setAlertNoMatch] = useState(false);
  const selectedItemRef = useRef<HTMLLIElement>(null);

  const inputValue = draft ?? (value ? cityName(value) : "");

  // Until the city list has arrived there is nothing to suggest, so the box cannot be typed
  // in and says why in place of its usual hint.
  const statusMessage = { loading: t("common.loading"), error: t("cities.error"), ready: null }[citiesStatus];

  // Keep the highlighted suggestion in view while moving through the list with the arrow keys.
  useEffect(() => {
    selectedItemRef.current?.scrollIntoView({ behavior: "instant", block: "nearest", inline: "start" });
  }, [selectedOption, suggestions]);

  const showSuggestions = (text: string) => {
    const filteredSuggestions = !text
      ? []
      : cities
          .filter((city) =>
            // SearchExpressions holds every spelling of a city, Persian and English, so the
            // same list serves both languages. The name as shown is checked too, because the
            // English one is written with spaces ("Abadeh Tashk") and the data has a hyphen.
            // (updated 2026-10-12)
            [...city.SearchExpressions, cityName(city)].some((expression) =>
              expression.toLowerCase().startsWith(text.toLowerCase())
            )
          )
          .sort((a, b) => b.Order - a.Order);
    setSuggestions(filteredSuggestions);
    setSelectedOption(0);
    if (text) setAlertNoMatch(!filteredSuggestions.length);
    return filteredSuggestions;
  };

  const closeSuggestions = () => {
    setAlertNoMatch(false);
    setSuggestions([]);
    setSelectedOption(null);
  };

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const text = event.target.value;
    setDraft(text);
    // Typed text counts as a choice only when it is exactly the name of one suggested city.
    const exactMatches = showSuggestions(text).filter((city) => cityName(city).toLowerCase() === text.toLowerCase());
    onChange(exactMatches.length === 1 ? exactMatches[0] : null);
  };

  const choose = (city: City) => {
    setDraft(null);
    onChange(city);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (!suggestions.length) return;
    if (event.key === "ArrowDown") {
      event.preventDefault();
      const next = selectedOption === null || selectedOption === suggestions.length - 1 ? 0 : selectedOption + 1;
      setSelectedOption(next);
      choose(suggestions[next]);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      const previous = selectedOption === 0 || selectedOption === null ? suggestions.length - 1 : selectedOption - 1;
      setSelectedOption(previous);
      choose(suggestions[previous]);
    } else if (event.key === "Enter") {
      event.preventDefault();
      // This Enter is used up by the list. Without stopPropagation the same key press would
      // go on to the page's own Enter handler and be counted a second time.
      event.stopPropagation();
      if (selectedOption != null) choose(suggestions[selectedOption]);
      closeSuggestions();
      onPick();
    }
  };

  return (
    <>
      <input
        ref={inputRef}
        type="text"
        placeholder={statusMessage ?? placeholder}
        readOnly={citiesStatus !== "ready"}
        value={inputValue}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        autoComplete="off"
        style={style}
        onFocus={() => {
          showSuggestions(inputValue);
          onFocus();
        }}
        onBlur={() => {
          // Text that names no city is thrown away: the box goes back to showing `value`.
          setDraft(null);
          closeSuggestions();
          onBlur();
        }}
      />
      {inputValue.length > 1 && suggestions.length > 0 ? (
        <ul className="suggestions">
          {suggestions.map((suggestion, index) => (
            <li
              style={{ paddingInlineStart: offset }}
              key={suggestion.ID}
              ref={index === selectedOption ? selectedItemRef : undefined}
              className={index === selectedOption ? "selected" : ""}
              onMouseDown={(e) => {
                // preventDefault keeps the focus in the text box, so a blur does not close
                // the list before the choice is made.
                e.preventDefault();
                e.stopPropagation();
                choose(suggestion);
                closeSuggestions();
                onPick();
              }}>
              {cityName(suggestion)}
              {" - "}
              <span className="province">{provinceName(suggestion)}</span>
            </li>
          ))}
        </ul>
      ) : (
        inputValue.length > 1 &&
        alertNoMatch && (
          <ul className="suggestions">
            <li className="no-match" style={{ paddingInlineStart: offset }}>{t("cities.noMatch")}</li>
          </ul>
        )
      )}
    </>
  );
};

export default CustomAutocomplete;
