import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { SeatMap, Service } from "../util/Models";
import { TbClockHour9 } from "react-icons/tb";
import s from "../assets/css/panel.module.css";
import defaultImg from "../assets/images/CompanyDefaultLogo.png";
import BusDetails from "./BusDetails";
import { fetchSeatMap } from "../util/FetchFunction";
import { useLocale } from "../util/useLocale";

interface Props {
  item: Service;
  originName: string;
  destinationName: string;
  // Whether this card shows its seat map. The list owns it, so only one card is open.
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  index?: number;
}

const Panel = ({ item, originName, destinationName, isOpen, setIsOpen, index = 0 }: Props) => {
  const navigate = useNavigate();
  const { t, num, amount, name, text, icons, path } = useLocale();
  const company = name(item.CompanyPersianName, item.CompanyName);
  const description = text(item.Description, item.DescriptionEnglish);
  // The seat map is loaded each time the card is opened. One call gives both the drawing and
  // a fresh count of free seats; the count from the search can be a little old.
  // (updated 2026-10-12)
  const [seatMap, setSeatMap] = useState<SeatMap | null>(null);
  const [errorFetching, setErrorFetching] = useState(false);
  const [loadingSeatCount, setLoadingSeatCount] = useState(false);
  // Goes up by one for each press of "try again", which makes the effect below run again.
  const [retryCount, setRetryCount] = useState(0);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const abortController = new AbortController();
    // This timer waits for a CSS animation: the seat map of the card that was open before
    // takes up to 0.4s to fold away (max-height in busDetails.module.css), which moves this
    // card up the page. Scrolling before that would land in the wrong place. (updated 2026-10-12)
    const scrollTimer = setTimeout(() => {
      if (!ref.current) return;
      const yOffset = -90;
      const y = ref.current.getBoundingClientRect().top + window.pageYOffset + yOffset;
      window.scrollTo({ top: y, behavior: "smooth" });
    }, 350);
    setLoadingSeatCount(true);
    setErrorFetching(false);
    fetchSeatMap(item.ID, abortController.signal)
      .then((result) => {
        setSeatMap(result);
        setLoadingSeatCount(false);
      })
      .catch((err) => {
        if (err.name === "AbortError") return;
        console.error("Error fetching details:", err);
        setSeatMap(null);
        setErrorFetching(true);
        setLoadingSeatCount(false);
      });
    return () => {
      clearTimeout(scrollTimer);
      abortController.abort();
      setLoadingSeatCount(false);
    };
  }, [isOpen, item.ID, retryCount]);

  return (
    <div className={s.panel} ref={ref} style={{ animationDuration: `${Math.min(index * 0.05 + 0.3, 0.6)}s` }}>
      <div className={s.flexRow}>
        <div className={s.companyLogo}>
          <img src={item.CompanyLogo} alt={t("trip.companyLogoAlt", { company })} onError={(e) => (e.currentTarget.src = defaultImg)} />
          <span>{company}</span>
        </div>
        <div className={s.info}>
          <h6>{t("trip.busType", { type: text(item.BusType, item.BusTypeEnglish) })}</h6>
          <div className={s.inner}>
            <div className={s.od}>
              {t("trip.place", { city: originName, terminal: name(item.OriginTerminalPersianName, item.OriginTerminalName) })}
              <i className={`fas ${icons.arrow}`} />
              {t("trip.place", { city: destinationName, terminal: name(item.DestinationTerminalPersianName, item.DestinationTerminalName) })}
            </div>
            <div className={s.departureTime}>
              {num(item.DepartureTime)}
              <TbClockHour9 className={s.iconClock} />
            </div>
            <div className={s.price}>
              {amount(item.Price)} <span> {t("common.rial")}</span>
            </div>
            <div className={s.buy}>
              <button onClick={() => setIsOpen(!isOpen)}>{t("trip.viewAndBuy")}</button>
              <span>
                {t("trip.freeSeats")}
                <span className={s.availableSeatCount}>
                  {!loadingSeatCount ? (
                    num(seatMap?.AvailableSeatCount ?? item.AvailableSeatCount)
                  ) : (
                    <i className="fas fa-spinner"></i>
                  )}
                </span>
              </span>
            </div>
          </div>
          {description && <div className={s.divider}></div>}
          {description && <div className={s.description}>{description}</div>}
          {!description && <div style={{ height: "30px" }}></div>}
        </div>
      </div>
      <BusDetails
        showDetails={isOpen}
        setShowDetails={setIsOpen}
        seatMap={seatMap}
        errorFetching={errorFetching}
        retry={() => setRetryCount((count) => count + 1)}
        onBuy={() => navigate(path(`/booking/${item.ID}`))}
      />
    </div>
  );
};

export default Panel;
