import "../assets/css/index.css";
import HomeHeader, { FocusedField } from "../components/HomeHeader";
import BlueHeader from "../components/BlueHeader";
import WholeNavbar from "../components/WholeNavbar";
import TwoColumns from "../components/TwoColumns";
import PositivePoints from "../components/PositivePoints";
import BottomNavbar from "../components/BottomNavbar";
import { useState } from "react";
import { CitiesStatus, City } from "../util/Models";

interface Props {
  cities: City[];
  citiesStatus: CitiesStatus;
}

function MainPage({ cities, citiesStatus }: Props) {
  // These two decide when the page is dimmed. They live here because both the navbar and
  // the search form need them.
  const [focusedField, setFocusedField] = useState<FocusedField>(null);
  const [calendarOpen, setCalendarOpen] = useState(false);

  return (
    <>
      <div
        className="space"
        style={{ height: "170px", backgroundColor: "#cbe6f8", zIndex: -1000, transform: "translateY(40px)" }}/>
      <WholeNavbar isFocused={focusedField !== null || calendarOpen} />
      <HomeHeader
        cities={cities}
        citiesStatus={citiesStatus}
        focusedField={focusedField}
        setFocusedField={setFocusedField}
        calendarOpen={calendarOpen}
        setCalendarOpen={setCalendarOpen}
      />
      <BlueHeader />
      <TwoColumns />
      <PositivePoints />
      <BottomNavbar />
    </>
  );
}

export default MainPage;
