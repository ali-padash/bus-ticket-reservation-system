import { useEffect, useRef, useState } from "react";
import { Service } from "../util/Models";
import { TbClockHour9 } from "react-icons/tb";
import s from "../assets/css/panel.module.css";
import defaultImg from "../assets/images/CompanyDefaultLogo.png";
import { toPersianNum, putComma } from "../util/Function";
import BusDetails from "./BusDetails";
import { fetchNumberOfAvailableSeats } from "../util/FetchFunction";

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
  // The count from the search can be a little old. Opening the card asks for a fresh one.
  const [freshSeatCount, setFreshSeatCount] = useState<number | null>(null);
  const [loadingSeatCount, setLoadingSeatCount] = useState(false);
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
    fetchNumberOfAvailableSeats(item.ID, abortController.signal)
      .then((result) => {
        setFreshSeatCount(result);
        setLoadingSeatCount(false);
      })
      .catch((err) => {
        if (err.name === "AbortError") return;
        console.error("Error fetching details:", err);
        setLoadingSeatCount(false);
      });
    return () => {
      clearTimeout(scrollTimer);
      abortController.abort();
      setLoadingSeatCount(false);
    };
  }, [isOpen, item.ID]);

  return (
    <div className={s.panel} ref={ref} style={{ animationDuration: `${Math.min(index * 0.05 + 0.3, 0.6)}s` }}>
      <div className={s.flexRow}>
        <div className={s.companyLogo}>
          <img src={item.CompanyLogo} alt="CompanyLogo" onError={(e) => (e.currentTarget.src = defaultImg)} />
          <span>{item.CompanyPersianName}</span>
        </div>
        <div className={s.info}>
          <h6>نوع اتوبوس {item.BusType}</h6>
          <div className={s.inner}>
            <div className={s.od}>
              {originName + " - پایانه " + item.OriginTerminalPersianName}
              <i className="fas fa-arrow-left" />
              {destinationName + " - پایانه " + item.DestinationTerminalPersianName}
            </div>
            <div className={s.departureTime}>
              {toPersianNum(item.DepartureTime)}
              <TbClockHour9 className={s.iconClock} />
            </div>
            <div className={s.price}>
              {toPersianNum(putComma(item.Price))} <span> ریال</span>
            </div>
            <div className={s.buy}>
              <button onClick={() => setIsOpen(!isOpen)}>مشاهده و خرید</button>
              <span>
                تعداد صندلی های خالی:
                <span className={s.availableSeatCount}>
                  {!loadingSeatCount ? (
                    toPersianNum(freshSeatCount ?? item.AvailableSeatCount)
                  ) : (
                    <i className="fas fa-spinner"></i>
                  )}
                </span>
              </span>
            </div>
          </div>
          {item.Description && <div className={s.divider}></div>}
          {item.Description && <div className={s.description}>{item.Description}</div>}
          {!item.Description && <div style={{ height: "30px" }}></div>}
        </div>
      </div>
      <BusDetails serviceID={item.ID} busCode={item.BusCode} showDetails={isOpen} setShowDetails={setIsOpen} />
    </div>
  );
};

export default Panel;
