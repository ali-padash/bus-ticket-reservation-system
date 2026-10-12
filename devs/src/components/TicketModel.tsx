import s from "../assets/css/ticketModel.module.css";
import routeBus from "../assets/images/routeBus.svg";
import { LineIcon } from "./Icon";
import { useLocale } from "../util/useLocale";

// The picture and the icons here are decoration: the picture carries an empty alt text and
// the icons are hidden from screen readers. (updated 2026-10-13)
const TicketModel = () => {
  const { t } = useLocale();
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
          <div className={s.odimg}>
            <span>{t("notify.sampleOrigin")}</span>
            <img src={routeBus} alt=""/>
            <span>{t("notify.sampleDestination")}</span>
          </div>
          <div className={s.inform}>
            <div className={s.accessory}>
              <i className="icon">
                <LineIcon name="date" />
              </i>
              <span>{t("notify.sampleDate")}</span>
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
