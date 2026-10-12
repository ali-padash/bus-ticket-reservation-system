import RefundBox from './RefundBox'
import BusSchema from './BusSchema'
import Legend from './Legend'
import s from "../assets/css/busDetails.module.css";
import { SeatMap } from '../util/Models';
import { useLocale } from '../util/useLocale';

interface Props {
  tripID: number
  setShowDetails: (showDetails: boolean) => void
  seatMap: SeatMap
  onBuy: () => void
}

const BusDetailsDisplay = ({ tripID, setShowDetails, seatMap, onBuy }: Props) => {
  const { t } = useLocale();
  return (
    <>
    <div className={s.cover}>
      <button className={s.transparentBuy} onClick={onBuy}>{t("seatMap.buy")}</button>
      <button className={s.backButton} onClick={() => setShowDetails(false)}>
        {t("seatMap.back")}
      </button>
    </div>
    <div className={s.dividerLine} />
    <div className={s.busInformation}>
      <BusSchema layout={seatMap.Layout} seats={seatMap.Seats} />
      <Legend className={s.legend} />
    </div>
    <RefundBox tripID={tripID} />
    <button className={s.greenBuy} onClick={onBuy}>{t("seatMap.buy")}</button>
  </>
  )
}

export default BusDetailsDisplay
