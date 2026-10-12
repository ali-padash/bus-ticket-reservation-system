import s from "../assets/css/ticketModel.module.css";
import img from "../assets/images/reserve.svg"
import busDash from "../assets/images/bus_dash.svg"
import calendar from "../assets/images/calender.svg"
import volume from "../assets/images/volume.svg"
import { useLocale } from "../util/useLocale";

// The pictures here are decoration, so they carry an empty alt text.
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
          <img src={img} alt=""/>
          <div className={s.dash}/>
          <div className={s.right}/>
          <div className={s.left}/>
        </div>
        <div className={s.theBody}>
          <h5>{t("notify.textLine1")} <br/> {t("notify.textLine2")}</h5>
          <div className={s.odimg}>
            <span>{t("notify.sampleOrigin")}</span>
            <img src={busDash} alt=""/>
            <span>{t("notify.sampleDestination")}</span>
          </div>
          <div className={s.inform}>
            <div className={s.accessory}>
              <img src={calendar} alt=""/>
              <span>{t("notify.sampleDate")}</span>
            </div>
            <div className={s.accessory}>
              <img src={volume} alt=""/>
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
