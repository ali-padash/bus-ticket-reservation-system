import RefundBox from './RefundBox'
import BusSchema from './BusSchema'
import Legend from './Legend'
import s from "../assets/css/busDetails.module.css";
import { SeatMap } from '../util/Models';

interface Props {
  setShowDetails: (showDetails: boolean) => void
  seatMap: SeatMap
  onBuy: () => void
}

const BusDetailsDisplay = ({ setShowDetails, seatMap, onBuy }: Props) => {
  return (
    <>
    <div className={s.cover}>
      <button className={s.transparentBuy} onClick={onBuy}>خرید</button>
      <button className={s.backButton} onClick={() => setShowDetails(false)}>
        بازگشت
      </button>
    </div>
    <div className={s.dividerLine} />
    <div className={s.busInformation}>
      <BusSchema layout={seatMap.Layout} seats={seatMap.Seats} />
      <Legend className={s.legend} />
    </div>
    <RefundBox />
    <button className={s.greenBuy} onClick={onBuy}>خرید</button>
  </>
  )
}

export default BusDetailsDisplay
