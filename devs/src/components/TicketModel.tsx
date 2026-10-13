import s from "../assets/css/ticketModel.module.css";
import routeBus from "../assets/images/routeBus.svg";
import { LineIcon } from "./Icon";
import { shortDate } from "../util/Locale";
import { useLocale } from "../util/useLocale";

interface Props {
  // The two cities of the search, in the page's language. Missing while they are unknown
  // (an address without usable cities); the route line is then left out.
  origin?: string;
  destination?: string;
  // The searched day, as YYYY-MM-DD.
  date: string;
}

// The "being arranged" card under the results. It shows the route and the day that were
// searched; it used to show a fixed sample route and an old sample date. (updated 2026-10-13)
//
// The picture and the icons here are decoration: the picture carries an empty alt text and
// the icons are hidden from screen readers. (updated 2026-10-13)
const TicketModel = ({ origin, destination, date }: Props) => {
  const { t, lang, num } = useLocale();
  return (
    <div className={s.ticketModel}>
      <div className={s.whole}>
        <div className={s.blueHeader}>
          <div className={s.title}>
            <h6>{t("notify.heading")}</h6>
            <p>{t("notify.subheading")}</p>
          </div>
          <i className={`icon ${s.headIcon}`}>
            <LineIcon name="ticket" />
          </i>
          <div className={s.dash}/>
          <div className={s.right}/>
          <div className={s.left}/>
        </div>
        <div className={s.theBody}>
          <h5>{t("notify.textLine1")} <br/> {t("notify.textLine2")}</h5>
          {origin && destination && (
            <div className={s.odimg}>
              <span>{origin}</span>
              <img src={routeBus} alt=""/>
              <span>{destination}</span>
            </div>
          )}
          <div className={s.inform}>
            <div className={s.accessory}>
              <i className="icon">
                <LineIcon name="date" />
              </i>
              <span>{num(shortDate(lang, date))}</span>
            </div>
            <div className={s.accessory}>
              <i className="icon">
                <LineIcon name="bus" />
              </i>
              <span>{t("notify.status")}</span>
            </div>
          </div>
          <button>{t("notify.signUp")}</button>
        </div>
      </div>
    </div>
  );
};

export default TicketModel;
