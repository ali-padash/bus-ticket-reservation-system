import "../assets/css/index.css";
import WholeNavbar from "../components/WholeNavbar";
import BottomNavbar from "../components/BottomNavbar";
import SearchPanel from "../components/SearchPanel";
import DaysTab from "../components/DaysTab";
import ServicesDisplay from "../components/ServicesDisplay";
import FilterSearch from "../components/FilterSearch";
import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import TicketModel from "../components/TicketModel";
import { CitiesStatus, City, ServiceResponse } from "../util/Models";
import { formatDate, parseDate } from "../util/Function";
import { fetchServices } from "../util/FetchFunction";

// A city ID from the address: a whole number above zero, or null if it is anything else.
const parseCityID = (value: string | null): number | null => {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
};

interface Props {
  cities: City[];
  citiesStatus: CitiesStatus;
}

function ServicePage({ cities, citiesStatus }: Props) {
  // The search is the address: /services?from=<cityId>&to=<cityId>&date=YYYY-MM-DD.
  // Nothing else remembers it, so a refresh or a shared link repeats the same search.
  const [searchParams, setSearchParams] = useSearchParams();
  const originID = parseCityID(searchParams.get("from"));
  const destinationID = parseCityID(searchParams.get("to"));
  // A link without a usable date means today.
  const selectedDate = parseDate(searchParams.get("date")) ?? new Date();
  const date = formatDate(selectedDate);

  const [servicesData, setServicesData] = useState<ServiceResponse | null>(null);
  const [errorFetching, setErrorFetching] = useState(false);
  // Counts presses of the search button, so pressing it again asks the server again even
  // when the address did not change.
  const [searchCount, setSearchCount] = useState(0);
  const [sortBasedOnPrice, setSortBasedOnPrice] = useState(false);
  const [checkedState, setCheckedState] = useState<{ [key: string]: boolean }>({ all: true });
  const [originState, setOriginState] = useState<{ [key: string]: boolean }>({ all: true });
  const [destinationState, setDestinationState] = useState<{ [key: string]: boolean }>({ all: true });

  useEffect(() => {
    if (!originID || !destinationID) {
      setServicesData(null);
      return;
    }
    const abortController = new AbortController();
    setServicesData(null);
    setErrorFetching(false);
    // A new search starts with every company and terminal shown.
    setCheckedState({ all: true });
    setOriginState({ all: true });
    setDestinationState({ all: true });
    fetchServices(date, originID, destinationID, abortController.signal)
      .then((data) => setServicesData(data))
      .catch((err) => {
        if (err.name !== "AbortError") setErrorFetching(true);
      });
    return () => abortController.abort();
  }, [originID, destinationID, date, searchCount]);

  const handleSearch = (from: City, to: City) => {
    setSearchParams({ from: String(from.ID), to: String(to.ID), date });
    setSearchCount((count) => count + 1);
  };

  const handleSelectDate = (newDate: Date) => {
    const newParams = new URLSearchParams(searchParams);
    newParams.set("date", formatDate(newDate));
    setSearchParams(newParams);
  };

  return (
    <>
      <div className="space" style={{ height: "135px", backgroundColor: "#f0f0f0", zIndex: -1000 }}></div>
      <WholeNavbar isFocused={false} />
      {/* The key starts the panel afresh when the cities in the address change (a new search,
          or the browser's back button) and when the city list arrives, so its two boxes
          always begin from the address. (updated 2026-10-12) */}
      <SearchPanel
        key={`${originID}-${destinationID}-${citiesStatus}`}
        cities={cities}
        citiesStatus={citiesStatus}
        initialOrigin={cities.find((city) => city.ID === originID) ?? null}
        initialDestination={cities.find((city) => city.ID === destinationID) ?? null}
        selectedDate={selectedDate}
        onSearch={handleSearch}
        onSelectDate={handleSelectDate}
      />
      <div style={{ backgroundColor: "#FBFBFB", paddingTop: "10px" }}>
        <h1 style={{ marginTop: 0 }}>
          {servicesData
            ? `بلیط اتوبوس ${servicesData.OriginPersianName} ${servicesData.DestinationPersianName}`
            : "در حال بارگذاری ..."}
        </h1>
        <FilterSearch
          servicesData={servicesData}
          sortBasedOnPrice={sortBasedOnPrice}
          setSortBasedOnPrice={setSortBasedOnPrice}
          checkedState={checkedState}
          setCheckedState={setCheckedState}
          originState={originState}
          setOriginState={setOriginState}
          destinationState={destinationState}
          setDestinationState={setDestinationState}
        />
      </div>
      <DaysTab selectedDate={selectedDate} onSelectDate={handleSelectDate} />
      <ServicesDisplay
        servicesData={servicesData}
        sortBasedOnPrice={sortBasedOnPrice}
        checkedState={checkedState}
        originState={originState}
        destinationState={destinationState}
        errorFetching={errorFetching || !originID || !destinationID}
        searchQuery={`from=${originID}&to=${destinationID}&date=${date}`}
      />
      <TicketModel />
      <BottomNavbar />
    </>
  );
}

export default ServicePage;
