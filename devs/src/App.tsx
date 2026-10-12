import { useEffect, useState } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";

import "./assets/css/index.css";
import MainPage from "./pages/MainPage"
import ServicePage from "./pages/ServicePage"
import { CitiesStatus, City } from "./util/Models";
import { fetchCities } from "./util/FetchFunction";


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

  return (
    <>
    <Router>
      <Routes>
        <Route path="/" element={<MainPage cities={cities} citiesStatus={citiesStatus} />} />
        <Route path="/services/" element={<ServicePage cities={cities} citiesStatus={citiesStatus} />} />
      </Routes>
    </Router>
    </>
  );
}

export default App;