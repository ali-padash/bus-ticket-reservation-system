import { useEffect, useState } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";

import "./assets/css/index.css";
import LanguageLayout from "./components/LanguageLayout";
import MainPage from "./pages/MainPage"
import ServicePage from "./pages/ServicePage"
import BookingPage from "./pages/BookingPage"
import TicketPage from "./pages/TicketPage"
import { CitiesStatus, City } from "./util/Models";
import { fetchCities } from "./util/FetchFunction";
import { DEFAULT_LANG } from "./util/Locale";


function App() {
  // The city list is asked for once, here at the top, and handed down to both pages. App is
  // never removed from the screen, so moving between the pages does not ask again.
  const [cities, setCities] = useState<City[]>([]);
  const [citiesStatus, setCitiesStatus] = useState<CitiesStatus>("loading");

  useEffect(() => {
    const abortController = new AbortController();
    fetchCities(abortController.signal)
      .then((data) => {
        setCities(data);
        setCitiesStatus("ready");
      })
      .catch((err) => {
        if (err.name !== "AbortError") setCitiesStatus("error");
      });
    return () => abortController.abort();
  }, []);

  // Every page lives under its language: /en/... and /fa/... . The first part of the address
  // is the only thing that says which language is on screen. LanguageLayout checks it and
  // sends an address without a language to the English page. (updated 2026-10-12)
  return (
    <>
    <Router>
      <Routes>
        <Route path="/:lang" element={<LanguageLayout />}>
          <Route index element={<MainPage cities={cities} citiesStatus={citiesStatus} />} />
          <Route path="services" element={<ServicePage cities={cities} citiesStatus={citiesStatus} />} />
          <Route path="booking/:tripId" element={<BookingPage />} />
          <Route path="tickets/:code" element={<TicketPage />} />
          <Route path="tickets/:code/payment" element={<TicketPage bank />} />
          <Route path="*" element={<Navigate to=".." replace />} />
        </Route>
        <Route path="*" element={<Navigate to={`/${DEFAULT_LANG}/`} replace />} />
      </Routes>
    </Router>
    </>
  );
}

export default App;
